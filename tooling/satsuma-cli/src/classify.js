/**
 * classify.js — Transform classification for Satsuma arrows
 *
 * Classifies arrow transform bodies based on their pipe step node types.
 * Classification is a mechanical CST check, not a content interpretation.
 */

/** Node types that indicate structural (deterministic) transform steps. */
const STRUCTURAL_TYPES = new Set(["token_call", "map_literal", "fragment_spread"]);

/** Node types that indicate NL (natural language) transform steps. */
const NL_TYPES = new Set(["nl_string", "multiline_string"]);

/**
 * Classify a transform pipe chain based on its pipe step children.
 *
 * @param {object[]} steps  Array of pipe_step CST nodes
 * @returns {'structural'|'nl'|'mixed'|'none'}
 */
export function classifyTransform(steps) {
  if (!steps || steps.length === 0) return "none";

  let hasStructural = false;
  let hasNl = false;

  for (const step of steps) {
    const inner = step.namedChildren[0];
    if (!inner) continue;
    if (STRUCTURAL_TYPES.has(inner.type)) hasStructural = true;
    else if (NL_TYPES.has(inner.type)) hasNl = true;
  }

  if (hasStructural && hasNl) return "mixed";
  if (hasStructural) return "structural";
  if (hasNl) return "nl";
  return "none";
}

/**
 * Determine if an arrow is derived (computed — no source path).
 *
 * @param {object} arrowNode  A map_arrow or computed_arrow CST node
 * @returns {boolean}
 */
export function classifyArrow(arrowNode) {
  return arrowNode.type === "computed_arrow";
}
