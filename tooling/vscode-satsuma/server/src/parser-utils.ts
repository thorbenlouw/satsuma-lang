import {
  Range,
  Position,
} from "vscode-languageserver";
import type { SyntaxNode, Tree } from "tree-sitter";

// ---------- tree-sitter initialisation ----------

let _parser: InstanceType<typeof import("tree-sitter")> | null = null;

export function getParser(): InstanceType<typeof import("tree-sitter")> {
  if (_parser) return _parser;
  // tree-sitter and tree-sitter-satsuma are CJS-only native addons
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Parser = require("tree-sitter");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Satsuma = require("tree-sitter-satsuma");
  _parser = new Parser();
  _parser!.setLanguage(Satsuma);
  return _parser!;
}

export function parseSource(source: string): Tree {
  return getParser().parse(source);
}

// ---------- CST → LSP helpers ----------

/** Convert a tree-sitter node span to an LSP Range. */
export function nodeRange(node: SyntaxNode): Range {
  return Range.create(
    Position.create(node.startPosition.row, node.startPosition.column),
    Position.create(node.endPosition.row, node.endPosition.column),
  );
}

/** First named child of the given type. */
export function child(node: SyntaxNode, type: string): SyntaxNode | null {
  return node.namedChildren.find((c) => c.type === type) ?? null;
}

/** All named children of the given type. */
export function children(node: SyntaxNode, type: string): SyntaxNode[] {
  return node.namedChildren.filter((c) => c.type === type);
}

/** Extract the display text from a block_label node. */
export function labelText(node: SyntaxNode): string | null {
  const lbl = child(node, "block_label");
  if (!lbl) return null;
  const inner = lbl.namedChildren[0];
  if (!inner) return null;
  if (inner.type === "quoted_name") return inner.text.slice(1, -1);
  return inner.text;
}

/** Strip delimiters from an NL string or multiline string node. */
export function stringText(node: SyntaxNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "multiline_string") return node.text.slice(3, -3).trim();
  if (node.type === "nl_string") return node.text.slice(1, -1);
  return node.text;
}
