/**
 * spread-expand.ts — CLI shim for satsuma-core spread expansion
 *
 * The core logic now lives in satsuma-core/src/spread-expand.ts. This shim
 * provides the original WorkspaceIndex-based API so existing CLI callers need
 * no changes. It will be collapsed when all callers are migrated in sl-n4wb.
 *
 * Architecture note (ADR-005): satsuma-core uses callback abstractions
 * (EntityRefResolver, SpreadEntityLookup) to avoid depending on WorkspaceIndex.
 * This shim bridges the gap by creating those callbacks from WorkspaceIndex.
 */

import {
  collectFieldPaths as _collectFieldPaths,
  expandSpreads as _expandSpreads,
  expandEntityFields as _expandEntityFields,
  expandNestedSpreads as _expandNestedSpreads,
} from "@satsuma/core";
import type {
  SpreadEntity,
  SpreadDiagnostic,
  ExpandedField,
} from "@satsuma/core";
import { resolveScopedEntityRef } from "./index-builder.js";
import type { FieldDecl, WorkspaceIndex } from "./types.js";

// Re-export the pure function directly.
export { collectFieldPaths } from "@satsuma/core";
export type { SpreadDiagnostic, ExpandedField };

// ── WorkspaceIndex → callback adapters ────────────────────────────────────────

function makeIndexRefResolver(currentNs: string | null, entityMap: Map<string, unknown>) {
  return (ref: string, _ns: string | null) => resolveScopedEntityRef(ref, currentNs, entityMap);
}

/**
 * Expand fragment spreads for a set of schema keys, adding fragment fields
 * to the fieldPaths set. Wraps satsuma-core's callback-based expandSpreads.
 */
export function expandSpreads(
  schemaKeys: string[],
  currentNs: string | null,
  index: WorkspaceIndex,
  fieldPaths: Set<string>,
  diagnostics: SpreadDiagnostic[] = [],
): boolean {
  const resolveRef = makeIndexRefResolver(currentNs, index.fragments as unknown as Map<string, unknown>);
  const lookupFragment = (key: string) => index.fragments.get(key) as SpreadEntity | undefined;
  const lookupSchema = (key: string) => index.schemas.get(key) as SpreadEntity | undefined;
  return _expandSpreads(schemaKeys, currentNs, resolveRef, lookupFragment, fieldPaths, diagnostics, lookupSchema);
}

/**
 * Expand fragment spreads for a single entity, returning expanded field objects.
 * Wraps satsuma-core's callback-based expandEntityFields.
 */
export function expandEntityFields(
  entity: SpreadEntity | null | undefined,
  currentNs: string | null,
  index: WorkspaceIndex,
): ExpandedField[] {
  const resolveRef = makeIndexRefResolver(currentNs, index.fragments as unknown as Map<string, unknown>);
  const lookupFragment = (key: string) => index.fragments.get(key) as SpreadEntity | undefined;
  return _expandEntityFields(entity, currentNs, resolveRef, lookupFragment);
}

/**
 * Recursively expand fragment spreads within nested record fields (in place).
 * Wraps satsuma-core's callback-based expandNestedSpreads.
 */
export function expandNestedSpreads(
  fields: FieldDecl[],
  currentNs: string | null,
  index: WorkspaceIndex,
): void {
  const resolveRef = makeIndexRefResolver(currentNs, index.fragments as unknown as Map<string, unknown>);
  const lookupFragment = (key: string) => index.fragments.get(key) as SpreadEntity | undefined;
  _expandNestedSpreads(fields, currentNs, resolveRef, lookupFragment);
}
