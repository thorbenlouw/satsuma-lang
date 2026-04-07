/**
 * field-utils.ts — field tree helpers shared by Satsuma consumers.
 *
 * These functions operate on the smallest common shape of extracted field
 * records so CLI commands, LSP features, and future consumers can reuse the
 * same nested-field traversal rules without coupling to one package's record
 * type.
 */

/** Minimal field-tree shape required by the shared traversal helpers. */
export interface FieldTreeNode {
  /** Field name with Satsuma quoting already stripped by the extractor. */
  name: string;
  /** Nested children for record/list_of record fields. */
  children?: FieldTreeNode[];
}

/**
 * Return the field node at a dotted path, or null when any segment is missing.
 *
 * Accepts either `"address.street"` or `["address", "street"]` so callers
 * that have already parsed user input do not need to re-join and split it.
 */
export function findFieldByPath<T extends FieldTreeNode>(
  fields: T[],
  path: string | string[],
): T | null {
  const segments = Array.isArray(path) ? path : path.split(".");
  let current: FieldTreeNode[] = fields;
  let found: FieldTreeNode | null = null;

  for (const segment of segments) {
    found = current.find((field) => field.name === segment) ?? null;
    if (!found) return null;
    current = found.children ?? [];
  }

  return found as T | null;
}

/**
 * Collect every field name in a tree, including nested child names.
 *
 * The returned names are bare leaf/container names, not dotted paths. This
 * preserves the historical command fallback that accepts a nested field by leaf
 * name when a fully dotted path is not available.
 */
export function collectFieldNames(fields: FieldTreeNode[]): string[] {
  const names: string[] = [];
  for (const field of fields) {
    names.push(field.name);
    if (field.children) names.push(...collectFieldNames(field.children));
  }
  return names;
}
