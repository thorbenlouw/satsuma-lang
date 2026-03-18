/**
 * normalize.js — Deterministic name normalization for field matching
 *
 * Normalizes field names by lowercasing and stripping underscores and hyphens.
 * Match is exact string equality after normalization — binary, no scoring.
 */

/**
 * Normalize a field name for comparison.
 * Lowercase, strip underscores and hyphens.
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
  return name.toLowerCase().replace(/[_-]/g, "");
}

/**
 * Match fields between source and target schemas by normalized name.
 *
 * @param {Array<{name:string, type:string}>} sourceFields
 * @param {Array<{name:string, type:string}>} targetFields
 * @returns {{matched: Array<{source:string, target:string, normalized:string}>, sourceOnly: string[], targetOnly: string[]}}
 */
export function matchFields(sourceFields, targetFields) {
  const targetByNorm = new Map();
  for (const f of targetFields) {
    targetByNorm.set(normalizeName(f.name), f.name);
  }

  const matched = [];
  const matchedTargetNorms = new Set();
  const sourceOnly = [];

  for (const f of sourceFields) {
    const norm = normalizeName(f.name);
    if (targetByNorm.has(norm)) {
      matched.push({
        source: f.name,
        target: targetByNorm.get(norm),
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
