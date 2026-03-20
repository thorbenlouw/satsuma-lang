/**
 * parser.js — tree-sitter Satsuma v2 parser wrapper
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

const require = createRequire(import.meta.url);

// Lazy-initialised — only required at first call so the module can be imported
// in unit tests without needing a compiled native binding.
let _parser = null;

function getParser() {
  if (_parser) return _parser;
  const Parser = require("tree-sitter");
  const STM = require("tree-sitter-satsuma");
  _parser = new Parser();
  _parser.setLanguage(STM);
  return _parser;
}

/**
 * Parse a single .stm file.
 *
 * @param {string} filePath  Absolute path to a .stm file
 * @returns {{ filePath: string, src: string, tree: object, errorCount: number }}
 */
export function parseFile(filePath) {
  const src = readFileSync(filePath, "utf8");
  const parser = getParser();
  const tree = parser.parse(src);
  const errorCount = countErrors(tree.rootNode);
  return { filePath, src, tree, errorCount };
}

/**
 * Parse source text directly (useful for testing without file I/O).
 *
 * @param {string} src   Satsuma source text
 * @returns {{ src: string, tree: object, errorCount: number }}
 */
export function parseSource(src) {
  const parser = getParser();
  const tree = parser.parse(src);
  const errorCount = countErrors(tree.rootNode);
  return { src, tree, errorCount };
}

/** Count ERROR nodes recursively in a tree node. */
function countErrors(node) {
  let n = node.type === "ERROR" ? 1 : 0;
  for (const child of node.namedChildren) n += countErrors(child);
  return n;
}
