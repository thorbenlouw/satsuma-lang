/**
 * coverage.ts — Mapping field coverage types and path utilities.
 *
 * "Coverage" means: for each field declared in a schema, does at least one
 * arrow inside the mapping reference it (directly or via a parent path)?
 *
 * Source coverage: a source field is covered when its name, a dotted path
 *   starting with it, or a qualifying parent path appears as a src_path in
 *   any arrow, each_block, or flatten_block inside the mapping.
 *
 * Target coverage: a target field is covered when its name or a qualifying
 *   path appears as a tgt_path in any arrow inside the mapping.
 *
 * Nested record fields are handled recursively: covering "address.city"
 * also counts as covering "address" (the parent prefix).
 *
 * This module defines the shared types (consumed by both the CLI and the LSP)
 * and the addPathAndPrefixes() path utility that both consumers use to build
 * their respective covered-path sets.  The higher-level computeMappingCoverage
 * function lives in vscode-satsuma/server/src/coverage.ts because it requires
 * LSP-specific WorkspaceIndex and FieldInfo types.
 */

// ── Public types ────────────────────────────────────────────────────────────

/**
 * Coverage status for a single field (leaf or record) in a schema.
 */
export interface FieldCoverageEntry {
  /** Qualified path from the schema root, e.g. "address" or "address.line1". */
  path: string;
  /** URI of the file where the schema is defined. */
  uri: string;
  /**
   * 0-indexed line number of the field declaration.
   * Set by the consumer from its field-position data (LSP: Range.start.line;
   * CLI: 0 when not available from the index).
   */
  line: number;
  /** True when at least one arrow in the mapping covers this field. */
  mapped: boolean;
}

/**
 * Coverage results for all fields in one schema participating in a mapping.
 */
export interface SchemaCoverageResult {
  /** Identifier of the schema (bare name or ns::name). */
  schemaId: string;
  /** Whether this schema appears on the source or target side of the mapping. */
  role: "source" | "target";
  /** One entry per field (leaf and record nodes), in declaration order. */
  fields: FieldCoverageEntry[];
}

/**
 * Top-level coverage result for a named mapping — all participating schemas.
 */
export interface MappingCoverageResult {
  /** One entry per schema referenced in source{} or target{} blocks. */
  schemas: SchemaCoverageResult[];
}

// ── Path utilities ──────────────────────────────────────────────────────────

/**
 * Register a path and all its ancestor prefixes in the covered-paths set.
 *
 * Strips array-notation brackets (`[]`) before splitting so that list-traversal
 * paths like `"items[].id"` are registered as `"items"`, `"items.id"`, and `"id"`.
 *
 * Registering ancestors means a top-level field `"address"` is considered
 * covered when an arrow targets the nested path `"address.city"` — a consumer
 * that checks `coveredPaths.has(f.name)` will correctly find the parent covered.
 *
 * Example: addPathAndPrefixes(set, "orders.item_id")
 *   → set now contains "orders", "orders.item_id", "item_id"
 */
export function addPathAndPrefixes(set: Set<string>, path: string): void {
  if (!path) return;
  // Strip array notation: "items[].id" → "items.id"
  const normalised = path.replace(/\[\]/g, "");
  const parts = normalised.split(".");
  let prefix = "";
  for (const part of parts) {
    prefix = prefix ? `${prefix}.${part}` : part;
    set.add(prefix);
    set.add(part); // bare leaf so "city" matches even if the full path is "address.city"
  }
}
