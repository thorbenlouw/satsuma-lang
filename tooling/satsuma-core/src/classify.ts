/**
 * classify.ts — Transform classification for Satsuma arrows
 *
 * Classifies arrow transform bodies based on their pipe step node types.
 * Classification is a mechanical CST check, not a content interpretation.
 */

import type { Classification, SyntaxNode } from "./types.js";

export type { Classification };

/** Node types that indicate NL (natural language) transform steps. */
const NL_TYPES = new Set(["nl_string", "multiline_string"]);

/**
 * Classify a transform pipe chain based on its pipe step children.
 */
export function classifyTransform(steps: SyntaxNode[] | null | undefined): Classification {
  if (!steps || steps.length === 0) return "none";

  let hasStructural = false;
  let hasNl = false;

  for (const step of steps) {
    const inner = step.namedChildren[0];
    if (!inner) continue;

    if (inner.type === "map_literal" || inner.type === "fragment_spread") {
      hasStructural = true;
    } else if (inner.type === "pipe_text") {
      // Check each child: NL strings count as NL, everything else as structural
      const kids = inner.namedChildren;
      let stepHasNl = false;
      let stepHasStructural = false;
      for (const k of kids) {
        if (NL_TYPES.has(k.type)) {
          stepHasNl = true;
        } else {
          stepHasStructural = true;
        }
      }
      if (stepHasNl) hasNl = true;
      if (stepHasStructural) hasStructural = true;
    }
  }

  if (hasStructural && hasNl) return "mixed";
  if (hasStructural) return "structural";
  if (hasNl) return "nl";
  return "none";
}

/**
 * Determine if an arrow is derived (computed — no source path).
 */
export function classifyArrow(arrowNode: SyntaxNode): boolean {
  return arrowNode.type === "computed_arrow";
}
