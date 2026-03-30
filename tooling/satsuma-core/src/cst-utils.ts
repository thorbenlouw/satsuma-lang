/**
 * cst-utils.ts — CST navigation helpers for Satsuma tree-sitter nodes
 *
 * Pure utility functions with no side effects. Both the CLI and LSP server
 * consume these; neither consumer should maintain its own copies.
 */

import type { SyntaxNode } from "./types.js";

/**
 * First named child of the given type, or null.
 * Filters out null entries for compatibility with web-tree-sitter's nullable array.
 */
export function child(node: SyntaxNode, type: string): SyntaxNode | null {
  return node.namedChildren.find((c) => c !== null && c.type === type) ?? null;
}

/**
 * All named children of the given type.
 * Filters out null entries for compatibility with web-tree-sitter's nullable array.
 */
export function children(node: SyntaxNode, type: string): SyntaxNode[] {
  return node.namedChildren.filter((c): c is SyntaxNode => c !== null && c.type === type);
}

/**
 * Collect all descendants of a given type (depth-first).
 */
export function allDescendants(node: SyntaxNode, type: string, acc: SyntaxNode[] = []): SyntaxNode[] {
  for (const c of node.namedChildren) {
    if (c !== null) {
      if (c.type === type) acc.push(c);
      allDescendants(c, type, acc);
    }
  }
  return acc;
}

/**
 * Extract text from a block_label child of `node`.
 * block_label → identifier | backtick_name
 */
export function labelText(node: SyntaxNode): string | null {
  const lbl = child(node, "block_label");
  if (!lbl) return null;
  const inner = lbl.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "backtick_name") return inner.text.slice(1, -1);
  return inner.text; // identifier
}

/**
 * Strip outer delimiters from a string node and unescape contents.
 *
 * - nl_string ("..."):      strip quotes, then unescape \" → " and \\ → \
 * - multiline_string ("""..."""): strip triple-quotes and trim (raw syntax, no escapes)
 * - other node types:       return raw text unchanged
 */
export function stringText(node: SyntaxNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "multiline_string") return node.text.slice(3, -3).trim();
  if (node.type === "nl_string") {
    return node.text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return node.text;
}

/**
 * Extract the text from a source/target entry node.
 * Handles backtick_name, nl_string, and plain identifier.
 */
export function entryText(node: SyntaxNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "backtick_name") return node.text.slice(1, -1);
  if (node.type === "nl_string") return node.text.slice(1, -1);
  return node.text; // identifier
}
