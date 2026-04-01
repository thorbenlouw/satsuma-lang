/**
 * coverage-paths.ts — Shared field-path coverage helpers.
 *
 * Consumers in the LSP and viz layer both need the same path semantics:
 * if an arrow references `customer.email`, both `customer` and
 * `customer.email` count as covered. This module centralizes that expansion so
 * UI layers do not reimplement their own nested-field matching rules.
 */

import { addPathAndPrefixes } from "./coverage.js";

/**
 * Expand a collection of field paths into a coverage set containing the full
 * path, its ancestor prefixes, and the leaf segment for each entry.
 */
export function buildCoveredFieldSet(paths: Iterable<string>): Set<string> {
  const covered = new Set<string>();
  for (const path of paths) addPathAndPrefixes(covered, path);
  return covered;
}

/**
 * Return true when a schema-local field path is covered by the expanded set.
 *
 * The caller must pass the schema-local path (`customer.email`, not
 * `orders.customer.email`). Matching is intentionally exact because
 * buildCoveredFieldSet() already registers prefixes and leaves.
 */
export function isCoveredFieldPath(path: string, coveredPaths: Set<string>): boolean {
  return coveredPaths.has(path);
}
