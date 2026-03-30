/**
 * nl-ref-extract.ts — CLI shim for satsuma-core NL ref extraction
 *
 * All logic now lives in satsuma-core/src/nl-ref.ts. This shim provides the
 * original WorkspaceIndex-based API so existing CLI callers need no changes.
 * It will be collapsed in sl-n4wb when all callers are updated.
 *
 * Architecture note (ADR-006): satsuma-core uses DefinitionLookup callbacks
 * to avoid depending on WorkspaceIndex. This shim bridges the gap.
 */

import {
  extractAtRefs,
  classifyRef,
  resolveRef as _resolveRef,
  extractNLRefData,
  resolveAllNLRefs as _resolveAllNLRefs,
  isSchemaInMappingSources as _isSchemaInMappingSources,
} from "@satsuma/core";
import type {
  AtRef,
  RefClassification,
  Resolution,
  ResolvedNLRef,
  DefinitionLookup,
} from "@satsuma/core";
import type { MappingRecord, NLRefData, WorkspaceIndex } from "./types.js";
import { expandEntityFields } from "./spread-expand.js";

// Re-export pure functions and types directly.
export { extractAtRefs, classifyRef, extractNLRefData };
export type { AtRef, RefClassification, Resolution, ResolvedNLRef };

// ── WorkspaceIndex → DefinitionLookup bridge ──────────────────────────────────

function makeLookup(index: WorkspaceIndex): DefinitionLookup {
  return {
    hasSchema: (key) => index.schemas.has(key),
    getSchema: (key) => index.schemas.get(key) ?? null,
    hasFragment: (key) => (index.fragments?.has(key) ?? false),
    getFragment: (key) => index.fragments?.get(key) ?? null,
    hasTransform: (key) => (index.transforms?.has(key) ?? false),
    getMapping: (key) => index.mappings.get(key) ?? null,
    iterateSchemas: () => index.schemas.entries() as unknown as Iterable<[string, { fields: import("@satsuma/core").FieldDecl[]; hasSpreads: boolean; namespace?: string | null; spreads?: string[] }]>,
    expandSpreads: (entity, ns) => expandEntityFields(entity, ns, index),
  };
}

interface MappingContext {
  sources: string[];
  targets: string[];
  namespace: string | null;
}

/**
 * Resolve a single backtick reference against the workspace index.
 */
export function resolveRef(ref: string, mappingContext: MappingContext, index: WorkspaceIndex): Resolution {
  return _resolveRef(ref, mappingContext, makeLookup(index));
}

/**
 * Process pre-extracted NL ref data into fully resolved reference records.
 */
export function resolveAllNLRefs(index: WorkspaceIndex): ResolvedNLRef[] {
  const nlRefData: NLRefData[] = index.nlRefData ?? [];
  return _resolveAllNLRefs(nlRefData, makeLookup(index));
}

/**
 * Check if a schema reference from an NL block is declared in the mapping's
 * source or target list.
 */
export function isSchemaInMappingSources(schemaRef: string, mapping: MappingRecord | undefined): boolean {
  return _isSchemaInMappingSources(schemaRef, mapping);
}
