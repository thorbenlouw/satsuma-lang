/**
 * canonical-ref.ts — Canonical field reference utility
 *
 * Produces the canonical [ns]::schema.field form used across all CLI output.
 * When no namespace is present, the :: prefix is retained for unambiguous parsing.
 */

/**
 * Build a canonical reference string.
 *
 * | namespace | schema | field | result |
 * |-----------|--------|-------|--------|
 * | undefined | "s"    | "f"   | "::s.f" |
 * | "ns"      | "s"    | "f"   | "ns::s.f" |
 * | undefined | "s"    | undefined | "::s" |
 * | "ns"      | "s"    | undefined | "ns::s" |
 */
export function canonicalRef(
  namespace: string | null | undefined,
  schema: string,
  field?: string | null,
): string {
  const ns = namespace ?? "";
  const base = `${ns}::${schema}`;
  if (field) return `${base}.${field}`;
  return base;
}

/**
 * Canonical display name for an entity record with namespace and name fields.
 * Consolidates the repeated `canonicalKey(entity.namespace ? ...)` pattern.
 *
 *   canonicalEntityName({ namespace: "crm", name: "customers" })  → "crm::customers"
 *   canonicalEntityName({ name: "customers" })                     → "::customers"
 *   canonicalEntityName({ name: null })                            → "::"
 */
export function canonicalEntityName(entity: { namespace?: string | null; name: string | null }): string {
  return canonicalRef(entity.namespace, entity.name ?? "");
}
