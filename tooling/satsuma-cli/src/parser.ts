/**
 * parser.ts — tree-sitter Satsuma v2 parser wrapper (WASM)
 *
 * Uses web-tree-sitter (WASM) for fully portable parsing with no native
 * compilation requirements.  The async initParser() must be awaited once
 * at startup (in index.ts) before any parsing can occur.  After that,
 * parseFile() and parseSource() are synchronous.
 */

import { readFileSync } from "fs";
import { createRequire } from "module";
import type { Parser } from "web-tree-sitter";
import type { ParsedFile, SyntaxNode, Tree } from "./types.js";

const require = createRequire(import.meta.url);

// ---------- WASM initialisation ----------

let _parser: Parser | null = null;
let _initPromise: Promise<void> | null = null;

/**
 * Initialise the WASM parser.  Must be awaited once before parseFile() or
 * parseSource() is called.  Subsequent calls are no-ops.
 */
export function initParser(wasmPath: string): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const TreeSitter = require("web-tree-sitter") as typeof import("web-tree-sitter");
    await TreeSitter.Parser.init();
    const lang = await TreeSitter.Language.load(wasmPath);
    _parser = new TreeSitter.Parser();
    _parser.setLanguage(lang);
  })();
  return _initPromise;
}

function getParser(): Parser {
  if (!_parser) throw new Error("Parser not initialised — call initParser() first");
  return _parser;
}

// ---------- Public API (unchanged) ----------

/**
 * Parse a single .stm file.
 */
export function parseFile(filePath: string): ParsedFile {
  const src = readFileSync(filePath, "utf8");
  const parser = getParser();
  const tree = parser.parse(src);
  if (!tree) throw new Error(`parse returned null for ${filePath}`);
  const errorCount = countErrors(tree.rootNode as unknown as SyntaxNode);
  return { filePath, src, tree: tree as unknown as Tree, errorCount };
}

/**
 * Parse source text directly (useful for testing without file I/O).
 */
export function parseSource(src: string): { src: string; tree: Tree; errorCount: number } {
  const parser = getParser();
  const tree = parser.parse(src);
  if (!tree) throw new Error("parse returned null");
  const errorCount = countErrors(tree.rootNode as unknown as SyntaxNode);
  return { src, tree: tree as unknown as Tree, errorCount };
}

/** Count ERROR nodes recursively in a tree node. */
function countErrors(node: SyntaxNode): number {
  let n = node.type === "ERROR" ? 1 : 0;
  for (const child of node.namedChildren) n += countErrors(child);
  return n;
}
