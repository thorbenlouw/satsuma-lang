/**
 * Shared test helper — initialises the WASM parser once and exports a parse()
 * function for use across all LSP server tests.
 */
const path = require("path");
const TreeSitter = require("web-tree-sitter");

const WASM_PATH = path.resolve(
  __dirname,
  "../../../tree-sitter-satsuma/tree-sitter-satsuma.wasm",
);

let _parser = null;

/** Initialise the WASM parser.  Must be awaited once before parse() is called. */
async function initTestParser() {
  if (_parser) return;
  await TreeSitter.Parser.init();
  const language = await TreeSitter.Language.load(WASM_PATH);
  _parser = new TreeSitter.Parser();
  _parser.setLanguage(language);
}

/** Parse Satsuma source.  Call initTestParser() first. */
function parse(source) {
  if (!_parser) throw new Error("Call initTestParser() before parse()");
  return _parser.parse(source);
}

/** Get the loaded Language instance (for Query construction in semantic token tests). */
function getLanguage() {
  if (!_parser) throw new Error("Call initTestParser() before getLanguage()");
  return _parser.language;
}

module.exports = { initTestParser, parse, getLanguage, TreeSitter };
