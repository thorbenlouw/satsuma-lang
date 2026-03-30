/**
 * string-utils.ts — Pure text utilities with no parser dependencies.
 *
 * Provides string helpers used across multiple satsuma tooling packages.
 * Nothing here should import from the grammar, CST, or any satsuma-specific
 * types — keep it portable so future tools can pull this in without the full
 * parser stack.
 */

/**
 * Capitalise the first character of a string, leaving the rest unchanged.
 * Used when formatting diagnostic messages that include a node kind as the
 * sentence subject (e.g. "Schema 'foo' is already defined…").
 */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Normalise a field name for fuzzy matching.
 *
 * Lowercases the string and strips underscores, hyphens, and spaces so that
 * semantically equivalent names compare equal:
 *   "First Name" === "first_name" === "FirstName" → "firstname"
 *
 * This is the canonical contract relied on by the field-matching logic — two
 * names are considered equivalent if and only if their normalised forms are
 * identical (binary equality, no scoring).
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[_\- ]/g, "");
}
