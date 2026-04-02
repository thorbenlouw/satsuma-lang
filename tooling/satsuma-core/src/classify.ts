/**
 * classify.ts — Transform classification for Satsuma arrows
 *
 * All pipe steps are NL (natural language) — bare tokens, quoted strings,
 * map literals, and spreads are all interpreted by an LLM or human. The
 * classification axis is therefore:
 *
 *   "nl"   — any non-empty transform body
 *   "none" — arrow with no transform body (direct copy)
 *
 * The "structural" and "mixed" variants that existed before Feature 28 are
 * removed. Classification is now a presence check, not a content analysis.
 */

import type { Classification, SyntaxNode } from "./types.js";

export type { Classification };

/**
 * Classify a transform pipe chain.
 *
 * Returns "nl" if the pipe chain has any steps; "none" if it is absent or
 * empty. All step content is treated uniformly as NL — no per-step type
 * analysis is needed.
 */
export function classifyTransform(steps: SyntaxNode[] | null | undefined): Classification {
  if (!steps || steps.length === 0) return "none";
  return "nl";
}

/**
 * Determine if an arrow is derived (computed — no source path).
 */
export function classifyArrow(arrowNode: SyntaxNode): boolean {
  return arrowNode.type === "computed_arrow";
}
