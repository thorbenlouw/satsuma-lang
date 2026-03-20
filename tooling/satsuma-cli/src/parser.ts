/**
 * parser.ts — tree-sitter Satsuma v2 parser wrapper
 *
 * Initialises the tree-sitter parser once and exposes a `parseFile` function
 * that reads a .stm file, parses it, and returns the tree together with any
 * parse error count.
 *
 * tree-sitter is a CJS package; we load it via createRequire so this ESM
 * module can import it without conversion.
 */

import { createRequire } from "module";
import { readFileSync } from "fs";
import type { ParsedFile, SyntaxNode, Tree } from "./types.js";

const require = createRequire(import.meta.url);

interface TSParser {
  setLanguage(lang: unknown): void;
  parse(source: string): Tree;
}

// Lazy-initialised — only required at first call so the module can be imported
// in unit tests without needing a compiled native binding.
let _parser: TSParser | null = null;

function getParser(): TSParser {
  if (_parser) return _parser;
  // CJS interop — tree-sitter has no ESM or @types exports
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const Parser = require("tree-sitter");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const STM = require("tree-sitter-satsuma");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  _parser = new Parser() as TSParser;
  _parser.setLanguage(STM);
  return _parser;
}

/**
 * Parse a single .stm file.
 */
export function parseFile(filePath: string): ParsedFile {
  const src = readFileSync(filePath, "utf8");
  const parser = getParser();
  const tree = parser.parse(src);
  const errorCount = countErrors(tree.rootNode);
  return { filePath, src, tree, errorCount };
}

/**
 * Parse source text directly (useful for testing without file I/O).
 */
export function parseSource(src: string): { src: string; tree: Tree; errorCount: number } {
  const parser = getParser();
  const tree = parser.parse(src);
  const errorCount = countErrors(tree.rootNode);
  return { src, tree, errorCount };
}

/** Count ERROR nodes recursively in a tree node. */
function countErrors(node: SyntaxNode): number {
  let n = node.type === "ERROR" ? 1 : 0;
  for (const child of node.namedChildren) n += countErrors(child);
  return n;
}
