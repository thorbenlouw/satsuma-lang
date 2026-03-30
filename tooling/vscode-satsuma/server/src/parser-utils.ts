/**
 * parser-utils.ts — LSP-specific parser helpers and CST navigation wrappers.
 *
 * The parser singleton (initParser / getParser / getLanguage) lives in
 * @satsuma/core and is re-exported here so existing server.ts callers need not
 * change their import paths.
 *
 * LSP callers pass a locateFile option to initParser() so that esbuild's CJS
 * bundle can find the web-tree-sitter runtime WASM (tree-sitter.wasm) next to
 * the bundled server.js, rather than at the module-relative default path.
 *
 * This module also wraps cst-utils functions from @satsuma/core to preserve
 * the concrete Node type used by other LSP server code.
 */

import {
  Range,
  Position,
} from "vscode-languageserver";
import type { Parser, Language, Tree, Node } from "web-tree-sitter";

// Re-export web-tree-sitter types under the names the rest of the server uses.
export type SyntaxNode = Node;
export type { Tree };

// Re-export the singleton lifecycle from core.
export { initParser, getParser, getLanguage } from "@satsuma/core";
export type { ParserInitOptions } from "@satsuma/core";

// ---------- CST navigation helpers (delegating to satsuma-core) ----------
//
// feat/26/sl-60gz: logic lives in satsuma-core/src/cst-utils.ts; wrappers here
// preserve the concrete `Node` type required by other LSP server code (which
// uses nodeRange() and web-tree-sitter WASM APIs that need the full Node type).

import {
  child as _child,
  children as _children,
  labelText as _labelText,
  stringText as _stringText,
} from "@satsuma/core";

/** First named child of the given type. */
export function child(node: Node, type: string): Node | null {
  return _child(node, type) as Node | null;
}

/** All named children of the given type. */
export function children(node: Node, type: string): Node[] {
  return _children(node, type) as Node[];
}

/** Extract the display text from a block_label node. */
export function labelText(node: Node): string | null {
  return _labelText(node);
}

/** Strip delimiters from an NL string or multiline string node. */
export function stringText(node: Node | null | undefined): string | null {
  return _stringText(node);
}

// ---------- Parsing ─────────────────────────────────────────────────────────

import { getParser as _getParser } from "@satsuma/core";

export function parseSource(source: string): Tree {
  const tree = _getParser().parse(source);
  if (!tree) throw new Error("parse returned null");
  return tree;
}

// ---------- CST → LSP helpers ----------

/** Convert a tree-sitter node span to an LSP Range. */
export function nodeRange(node: Node): Range {
  return Range.create(
    Position.create(node.startPosition.row, node.startPosition.column),
    Position.create(node.endPosition.row, node.endPosition.column),
  );
}

// Silence unused import warnings for type-only imports from web-tree-sitter.
// Parser and Language are used by callers importing these re-exported types.
export type { Parser, Language };
