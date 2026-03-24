/**
 * normalize.ts — Deterministic name normalization for field matching
 *
 * Normalizes field names by lowercasing and stripping underscores and hyphens.
 * Match is exact string equality after normalization — binary, no scoring.
 */

import type { FieldDecl, FieldMatch, MatchResult } from "./types.js";

/**
 * Normalize a field name for comparison.
 * Lowercase, strip underscores, hyphens, and spaces.
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[_\- ]/g, "");
}

/**
 * Flatten nested fields into dotted path names for matching.
 */
function flattenFields(fields: FieldDecl[], prefix = ""): { name: string }[] {
  const result: { name: string }[] = [];
  for (const f of fields) {
    const fullName = prefix ? `${prefix}.${f.name}` : f.name;
    result.push({ name: fullName });
    if (f.children && f.children.length > 0) {
      result.push(...flattenFields(f.children, fullName));
    }
  }
  return result;
}

/**
 * Match fields between source and target schemas by normalized name.
 * Recurses into nested records, matching by leaf name across nesting levels.
 */
export function matchFields(sourceFields: FieldDecl[], targetFields: FieldDecl[]): MatchResult {
  const flatSource = flattenFields(sourceFields);
  const flatTarget = flattenFields(targetFields);

  const targetByNorm = new Map<string, string>();
  for (const f of flatTarget) {
    const norm = normalizeName(f.name);
    if (!targetByNorm.has(norm)) targetByNorm.set(norm, f.name);
    // Also index by leaf name for cross-level matching
    const leaf = f.name.split(".").pop()!;
    const leafNorm = normalizeName(leaf);
    if (!targetByNorm.has(leafNorm)) targetByNorm.set(leafNorm, f.name);
  }

  const matched: FieldMatch[] = [];
  const matchedTargetNorms = new Set<string>();
  const sourceOnly: string[] = [];

  for (const f of flatSource) {
    const norm = normalizeName(f.name);
    const leaf = f.name.split(".").pop()!;
    const leafNorm = normalizeName(leaf);

    if (targetByNorm.has(norm)) {
      matched.push({
        source: f.name,
        target: targetByNorm.get(norm)!,
        normalized: norm,
      });
      matchedTargetNorms.add(norm);
    } else if (targetByNorm.has(leafNorm)) {
      matched.push({
        source: f.name,
        target: targetByNorm.get(leafNorm)!,
        normalized: leafNorm,
      });
      matchedTargetNorms.add(leafNorm);
    } else {
      sourceOnly.push(f.name);
    }
  }

  const targetOnly = flatTarget
    .filter((f) => {
      const norm = normalizeName(f.name);
      const leaf = f.name.split(".").pop()!;
      return !matchedTargetNorms.has(norm) && !matchedTargetNorms.has(normalizeName(leaf));
    })
    .map((f) => f.name);

  return { matched, sourceOnly, targetOnly };
}
