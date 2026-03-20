/**
 * spread-expand.js — Fragment spread expansion for Satsuma workspaces
 *
 * Resolves fragment spreads in schemas and fragments, inlining the fragment
 * fields into the caller's field set. Handles transitive spreads, cycle
 * detection, and diamond-shaped spread graphs.
 *
 * Shared by validate.js and CLI commands that need expanded field lists.
 */

import { resolveScopedEntityRef } from "./index-builder.js";

/**
 * Resolve an entity name against the index with namespace-aware lookup.
 */
function resolveEntityRef(ref, currentNs, entityMap) {
  return resolveScopedEntityRef(ref, currentNs, entityMap);
}

/**
 * Recursively collect all valid dotted field paths from a field tree.
 *
 * @param {Array<{name:string, type:string, children?:Array}>} fields
 * @param {string} prefix  dot-separated path prefix (e.g. "Order.")
 * @param {Set<string>} paths  accumulator set
 */
export function collectFieldPaths(fields, prefix, paths) {
  for (const f of fields) {
    const fullPath = prefix + f.name;
    paths.add(fullPath);
    if (f.isList) {
      paths.add(prefix + f.name + "[]");
    }
    if (f.children && f.children.length > 0) {
      collectFieldPaths(f.children, fullPath + ".", paths);
      if (f.isList) {
        collectFieldPaths(f.children, fullPath + "[].", paths);
      }
    }
  }
}

/**
 * Expand fragment spreads for a set of schema keys, adding fragment fields
 * to the fieldPaths set. Returns true if any spread references an
 * unresolvable fragment.
 *
 * @param {string[]} schemaKeys  resolved schema keys to expand
 * @param {string|null} currentNs  namespace context for resolution
 * @param {object} index  WorkspaceIndex
 * @param {Set<string>} fieldPaths  accumulator set (mutated)
 * @param {Array} diagnostics  accumulator for cycle warnings (optional)
 * @returns {boolean}  true if any spread could not be resolved
 */
export function expandSpreads(schemaKeys, currentNs, index, fieldPaths, diagnostics = []) {
  let hasUnresolved = false;
  const visited = new Set();
  for (const key of schemaKeys) {
    const schema = index.schemas.get(key);
    if (!schema?.hasSpreads) continue;
    if (!expandEntitySpreads(schema, currentNs, index, fieldPaths, visited, diagnostics, [])) {
      hasUnresolved = true;
    }
  }
  return hasUnresolved;
}

/**
 * Expand fragment spreads for a single entity (schema or fragment), returning
 * the expanded field objects (not paths). Useful for commands that need the
 * actual field objects rather than just path strings.
 *
 * @param {object} entity  schema or fragment with spreads/hasSpreads/fields
 * @param {string|null} currentNs  namespace context for resolution
 * @param {object} index  WorkspaceIndex
 * @returns {Array<{name:string, type:string, fromFragment?:string}>}  expanded fields
 */
export function expandEntityFields(entity, currentNs, index) {
  const expandedFields = [];
  if (!entity?.hasSpreads) return expandedFields;

  const visited = new Set();
  collectExpandedFields(entity, currentNs, index, expandedFields, visited, []);
  return expandedFields;
}

/**
 * Recursively collect expanded field objects from fragment spreads.
 */
function collectExpandedFields(entity, currentNs, index, fields, visited, chain) {
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
 * Recursively expand spreads for a schema or fragment, adding fragment fields
 * to the fieldPaths set. Detects cycles and emits diagnostics for them.
 *
 * @param {object} entity  schema or fragment with spreads/hasSpreads/fields
 * @param {string|null} currentNs  namespace context for resolution
 * @param {object} index  WorkspaceIndex
 * @param {Set<string>} fieldPaths  accumulator set (mutated)
 * @param {Set<string>} expanded  already fully expanded keys (efficiency)
 * @param {Array} diagnostics  accumulator for cycle warnings
 * @param {string[]} chain  current expansion chain for cycle reporting
 * @returns {boolean}  true if all spreads resolved, false if any unresolvable
 */
function expandEntitySpreads(entity, currentNs, index, fieldPaths, expanded, diagnostics, chain) {
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
