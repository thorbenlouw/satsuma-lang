/**
 * spread-expand.ts — Fragment spread expansion for Satsuma workspaces
 *
 * Resolves fragment spreads in schemas and fragments, inlining the fragment
 * fields into the caller's field set. Handles transitive spreads, cycle
 * detection, and diamond-shaped spread graphs.
 *
 * Shared by validate.js and CLI commands that need expanded field lists.
 */

import type { FieldDecl, WorkspaceIndex } from "./types.js";
import { resolveScopedEntityRef } from "./index-builder.js";

interface SpreadEntity {
  fields: FieldDecl[];
  hasSpreads: boolean;
  spreads?: string[];
  file?: string;
  row?: number;
}

interface ExpandedField extends FieldDecl {
  fromFragment?: string;
}

interface SpreadDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: string;
  rule: string;
  message: string;
}

/**
 * Resolve an entity name against the index with namespace-aware lookup.
 */
function resolveEntityRef(ref: string, currentNs: string | null, entityMap: Map<string, unknown>): string | null {
  return resolveScopedEntityRef(ref, currentNs, entityMap);
}

/**
 * Recursively collect all valid dotted field paths from a field tree.
 */
export function collectFieldPaths(fields: FieldDecl[], prefix: string, paths: Set<string>): void {
  for (const f of fields) {
    const fullPath = prefix + f.name;
    paths.add(fullPath);
    if (f.children && f.children.length > 0) {
      collectFieldPaths(f.children, fullPath + ".", paths);
    }
  }
}

/**
 * Expand fragment spreads for a set of schema keys, adding fragment fields
 * to the fieldPaths set. Returns true if any spread references an
 * unresolvable fragment.
 */
export function expandSpreads(
  schemaKeys: string[],
  currentNs: string | null,
  index: WorkspaceIndex,
  fieldPaths: Set<string>,
  diagnostics: SpreadDiagnostic[] = [],
): boolean {
  let hasUnresolved = false;
  const visited = new Set<string>();
  for (const key of schemaKeys) {
    const schema = index.schemas.get(key);
    if (!schema?.hasSpreads) continue;
    if (!expandEntitySpreads(schema, currentNs, index, fieldPaths, visited, diagnostics, [])) {
      hasUnresolved = true;
    }
    // Also expand nested record-level spreads into fieldPaths
    expandNestedFieldPaths(schema.fields, "", currentNs, index, fieldPaths);
  }
  return hasUnresolved;
}

/**
 * Walk the field tree and expand nested record-level spreads into the
 * fieldPaths set with proper prefixing.
 */
function expandNestedFieldPaths(
  fields: FieldDecl[],
  prefix: string,
  currentNs: string | null,
  index: WorkspaceIndex,
  fieldPaths: Set<string>,
): void {
  for (const field of fields) {
    if (field.children && field.hasSpreads && field.spreads) {
      const fieldPrefix = prefix + field.name + ".";
      for (const spreadName of field.spreads) {
        const resolvedKey = resolveEntityRef(spreadName, currentNs, index.fragments);
        if (!resolvedKey) continue;
        const fragment = index.fragments.get(resolvedKey);
        if (!fragment) continue;
        collectFieldPaths(fragment.fields, fieldPrefix, fieldPaths);
      }
    }
    if (field.children) {
      expandNestedFieldPaths(field.children, prefix + field.name + ".", currentNs, index, fieldPaths);
    }
  }
}

/**
 * Expand fragment spreads for a single entity (schema or fragment), returning
 * the expanded field objects (not paths). Useful for commands that need the
 * actual field objects rather than just path strings.
 */
export function expandEntityFields(
  entity: SpreadEntity | null | undefined,
  currentNs: string | null,
  index: WorkspaceIndex,
): ExpandedField[] {
  const expandedFields: ExpandedField[] = [];
  if (!entity?.hasSpreads) return expandedFields;

  const visited = new Set<string>();
  collectExpandedFields(entity, currentNs, index, expandedFields, visited, []);
  return expandedFields;
}

/**
 * Recursively collect expanded field objects from fragment spreads.
 */
function collectExpandedFields(
  entity: SpreadEntity,
  currentNs: string | null,
  index: WorkspaceIndex,
  fields: ExpandedField[],
  visited: Set<string>,
  chain: string[],
): void {
  const spreads = entity.spreads ?? [];
  if (spreads.length === 0) return;

  const ancestors = new Set(chain);
  for (const spreadName of spreads) {
    const resolvedKey = resolveEntityRef(spreadName, currentNs, index.fragments);
    if (!resolvedKey) continue;
    if (ancestors.has(resolvedKey)) continue; // cycle
    if (visited.has(resolvedKey)) continue; // diamond
    visited.add(resolvedKey);

    const fragment = index.fragments.get(resolvedKey);
    if (!fragment) continue;

    for (const f of fragment.fields) {
      fields.push({ ...f, fromFragment: resolvedKey });
    }

    // Recursively expand spreads within this fragment
    if (fragment.hasSpreads) {
      collectExpandedFields(fragment, currentNs, index, fields, visited, [...chain, resolvedKey]);
    }
  }
}

/**
 * Recursively expand fragment spreads within nested record fields.
 * Modifies field children in place, inserting fragment fields into the
 * correct nesting level rather than hoisting to the schema level.
 */
export function expandNestedSpreads(
  fields: FieldDecl[],
  currentNs: string | null,
  index: WorkspaceIndex,
): void {
  for (const field of fields) {
    if (field.children) {
      // First recurse into deeper levels
      expandNestedSpreads(field.children, currentNs, index);
      // Then expand spreads at this level
      if (field.hasSpreads && field.spreads) {
        const expanded = expandEntityFields(
          { fields: field.children, hasSpreads: true, spreads: field.spreads },
          currentNs,
          index,
        );
        field.children = [...field.children, ...expanded];
        delete field.hasSpreads;
        delete field.spreads;
      }
    }
  }
}

/**
 * Recursively expand spreads for a schema or fragment, adding fragment fields
 * to the fieldPaths set. Detects cycles and emits diagnostics for them.
 */
function expandEntitySpreads(
  entity: SpreadEntity,
  currentNs: string | null,
  index: WorkspaceIndex,
  fieldPaths: Set<string>,
  expanded: Set<string>,
  diagnostics: SpreadDiagnostic[],
  chain: string[],
): boolean {
  const spreads = entity.spreads ?? [];
  if (spreads.length === 0 && entity.hasSpreads) return false;
  const ancestors = new Set(chain);
  let allResolved = true;
  for (const spreadName of spreads) {
    const resolvedKey = resolveEntityRef(spreadName, currentNs, index.fragments);
    if (!resolvedKey) {
      allResolved = false;
      continue;
    }
    if (ancestors.has(resolvedKey)) {
      const cycleStart = chain.indexOf(resolvedKey);
      const cyclePath = [...chain.slice(cycleStart), resolvedKey];
      diagnostics.push({
        file: entity.file ?? "unknown",
        line: entity.row != null ? entity.row + 1 : 1,
        column: 1,
        severity: "error",
        rule: "circular-spread",
        message: `Circular fragment spread detected: ${cyclePath.join(" → ")}`,
      });
      continue;
    }
    if (expanded.has(resolvedKey)) continue;
    expanded.add(resolvedKey);
    const fragment = index.fragments.get(resolvedKey);
    if (!fragment) {
      allResolved = false;
      continue;
    }
    collectFieldPaths(fragment.fields, "", fieldPaths);
    if (fragment.hasSpreads) {
      if (!expandEntitySpreads(fragment, currentNs, index, fieldPaths, expanded, diagnostics, [...chain, resolvedKey])) {
        allResolved = false;
      }
    }
  }
  return allResolved;
}
