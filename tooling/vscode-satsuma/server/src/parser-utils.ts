import {
  Range,
  Position,
} from "vscode-languageserver";
import type { Parser, Language, Tree, Node } from "web-tree-sitter";

// Re-export web-tree-sitter types under the names the rest of the server uses.
export type SyntaxNode = Node;
export type { Tree };

// ---------- tree-sitter initialisation (WASM) ----------

let _parser: Parser | null = null;
let _language: Language | null = null;
let _initPromise: Promise<void> | null = null;

/**
 * Initialise the WASM parser.  Must be awaited once before getParser() is
 * called.  Subsequent calls are no-ops.
 */
export function initParser(wasmPath: string): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const path = require("path");
    const TreeSitter = require("web-tree-sitter") as typeof import("web-tree-sitter");
    // The runtime WASM (tree-sitter.wasm) is copied next to server.js during build.
    // We must tell web-tree-sitter where to find it since esbuild bundling changes
    // the default module-relative lookup path.
    const runtimeWasm = path.join(path.dirname(wasmPath), "tree-sitter.wasm");
    await TreeSitter.Parser.init({
      locateFile: () => runtimeWasm,
    });
    _language = await TreeSitter.Language.load(wasmPath);
    _parser = new TreeSitter.Parser();
    _parser.setLanguage(_language);
  })();
  return _initPromise;
}

export function getParser(): Parser {
  if (!_parser) throw new Error("Parser not initialised — call initParser() first");
  return _parser;
}

export function getLanguage(): Language {
  if (!_language) throw new Error("Language not loaded — call initParser() first");
  return _language;
}

export function parseSource(source: string): Tree {
  const tree = getParser().parse(source);
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

/** First named child of the given type. */
export function child(node: Node, type: string): Node | null {
  return node.namedChildren.find((c) => c !== null && c.type === type) ?? null;
}

/** All named children of the given type. */
export function children(node: Node, type: string): Node[] {
  return node.namedChildren.filter((c): c is Node => c !== null && c.type === type);
}

/** Extract the display text from a block_label node. */
export function labelText(node: Node): string | null {
  const lbl = child(node, "block_label");
  if (!lbl) return null;
  const inner = lbl.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "backtick_name") return inner.text.slice(1, -1);
  return inner.text;
}

/** Strip delimiters from an NL string or multiline string node. */
export function stringText(node: Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "multiline_string") return node.text.slice(3, -3).trim();
  if (node.type === "nl_string") return node.text.slice(1, -1);
  return node.text;
}
