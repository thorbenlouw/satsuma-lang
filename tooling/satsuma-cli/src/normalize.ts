/**
 * normalize.ts — Deterministic name normalization for field matching
 *
 * Normalizes field names by lowercasing and stripping underscores and hyphens.
 * Match is exact string equality after normalization — binary, no scoring.
 */

import type { FieldDecl, FieldMatch, MatchResult } from "./types.js";

/**
 * Normalize a field name for comparison.
 * Lowercase, strip underscores and hyphens.
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[_-]/g, "");
}

/**
 * Match fields between source and target schemas by normalized name.
 */
export function matchFields(sourceFields: FieldDecl[], targetFields: FieldDecl[]): MatchResult {
  const targetByNorm = new Map<string, string>();
  for (const f of targetFields) {
    targetByNorm.set(normalizeName(f.name), f.name);
  }

  const matched: FieldMatch[] = [];
  const matchedTargetNorms = new Set<string>();
  const sourceOnly: string[] = [];

  for (const f of sourceFields) {
    const norm = normalizeName(f.name);
    if (targetByNorm.has(norm)) {
      matched.push({
        source: f.name,
        target: targetByNorm.get(norm)!,
        normalized: norm,
      });
      matchedTargetNorms.add(norm);
    } else {
      sourceOnly.push(f.name);
    }
  }

  const targetOnly = targetFields
    .filter((f) => !matchedTargetNorms.has(normalizeName(f.name)))
    .map((f) => f.name);

  return { matched, sourceOnly, targetOnly };
}
