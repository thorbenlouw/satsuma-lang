/**
 * format.ts — Satsuma formatter core
 *
 * Pure function: takes a tree-sitter Tree and the original source string,
 * returns the formatted string. No I/O, no configuration, no side effects.
 *
 * The formatter walks the full CST (node.children, not just namedChildren)
 * to preserve comments and all anonymous tokens (punctuation, keywords).
 *
 * Current phase: pass-through baseline — reproduces the original source
 * by collecting leaf nodes and emitting inter-node gaps from the source.
 * Subsequent tickets layer formatting rules on top of this walk.
 */

import type { SyntaxNode, Tree } from "./types.js";

/**
 * Format a Satsuma source string given its tree-sitter parse tree.
 *
 * @param tree  - tree-sitter Tree (must still be valid / not reused)
 * @param source - the original source text that was parsed
 * @returns the formatted source string
 */
export function format(tree: Tree, source: string): string {
  const leaves: SyntaxNode[] = [];
  collectLeaves(tree.rootNode, leaves);

  let result = "";
  let pos = 0;

  for (const leaf of leaves) {
    // Emit the gap between the previous token and this one (whitespace, newlines)
    if (leaf.startIndex > pos) {
      result += source.slice(pos, leaf.startIndex);
    }
    // Emit the leaf token text
    result += leaf.text;
    pos = leaf.endIndex;
  }

  // Emit any trailing content after the last leaf (e.g. final newline)
  if (pos < source.length) {
    result += source.slice(pos);
  }

  return result;
}

/**
 * Recursively collect all leaf nodes from the CST in document order.
 * Walks node.children (all children, including anonymous tokens and comments)
 * rather than namedChildren, so nothing is skipped.
 */
function collectLeaves(node: SyntaxNode, out: SyntaxNode[]): void {
  if (node.childCount === 0) {
    out.push(node);
    return;
  }
  for (const child of node.children) {
    collectLeaves(child, out);
  }
}
