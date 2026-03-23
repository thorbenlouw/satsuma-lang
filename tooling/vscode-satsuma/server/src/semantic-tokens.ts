import {
  SemanticTokensBuilder,
  SemanticTokenTypes,
  SemanticTokenModifiers,
  SemanticTokensLegend,
} from "vscode-languageserver";
import type { Tree, SyntaxNode } from "tree-sitter";

// ---------- Legend ----------

/** Ordered token types — index positions are referenced by the builder. */
const tokenTypes: string[] = [
  SemanticTokenTypes.keyword,       // 0
  SemanticTokenTypes.type,          // 1
  SemanticTokenTypes.function,      // 2
  SemanticTokenTypes.variable,      // 3
  SemanticTokenTypes.property,      // 4
  SemanticTokenTypes.string,        // 5
  SemanticTokenTypes.comment,       // 6
  SemanticTokenTypes.decorator,     // 7
  SemanticTokenTypes.namespace,     // 8
  SemanticTokenTypes.operator,      // 9
  SemanticTokenTypes.enumMember,    // 10
  SemanticTokenTypes.number,        // 11 (unused, but standard)
];

/** Ordered token modifiers — bitmask positions. */
const tokenModifiers: string[] = [
  SemanticTokenModifiers.definition,    // 0
  SemanticTokenModifiers.declaration,   // 1
  SemanticTokenModifiers.readonly,      // 2
  SemanticTokenModifiers.defaultLibrary,// 3
];

export const semanticTokensLegend: SemanticTokensLegend = {
  tokenTypes,
  tokenModifiers,
};

// ---------- Capture name → token type/modifier mapping ----------

interface TokenMapping {
  typeIndex: number;
  modifierBits: number;
}

/**
 * Map highlights.scm capture names to LSP semantic token type indices
 * and modifier bitmasks.
 */
const CAPTURE_MAP: Record<string, TokenMapping> = {
  // Keywords
  "keyword":            { typeIndex: 0, modifierBits: 0 },
  "keyword.import":     { typeIndex: 0, modifierBits: 0 },
  "keyword.context":    { typeIndex: 0, modifierBits: 0 },
  "keyword.operator":   { typeIndex: 0, modifierBits: 0 },

  // Block labels — definitions
  "type.definition":    { typeIndex: 1, modifierBits: 1 << 0 },  // type + definition
  "function.definition":{ typeIndex: 2, modifierBits: 1 << 0 },  // function + definition
  "module":             { typeIndex: 8, modifierBits: 0 },        // namespace

  // Fields and variables
  "variable.field":     { typeIndex: 4, modifierBits: 0 },        // property
  "variable":           { typeIndex: 3, modifierBits: 0 },        // variable

  // Types
  "type":               { typeIndex: 1, modifierBits: 0 },

  // Metadata / decorators
  "attribute":          { typeIndex: 7, modifierBits: 0 },        // decorator

  // Strings
  "string":             { typeIndex: 5, modifierBits: 0 },
  "string.special":     { typeIndex: 5, modifierBits: 0 },
  "string.multiline":   { typeIndex: 5, modifierBits: 0 },
  "string.path":        { typeIndex: 5, modifierBits: 0 },

  // Comments
  "comment":            { typeIndex: 6, modifierBits: 0 },
  "comment.warning":    { typeIndex: 6, modifierBits: 0 },
  "comment.question":   { typeIndex: 6, modifierBits: 0 },

  // Constants (enum values, map keys/values, builtins)
  "constant":           { typeIndex: 10, modifierBits: 0 },       // enumMember
  "constant.builtin":   { typeIndex: 10, modifierBits: 1 << 3 },  // enumMember + defaultLibrary

  // Operators / punctuation
  "operator":           { typeIndex: 9, modifierBits: 0 },
  "punctuation.bracket":{ typeIndex: 9, modifierBits: 0 },
  "punctuation.delimiter":{ typeIndex: 9, modifierBits: 0 },

  // Function calls (pipe chain tokens)
  "function.call":      { typeIndex: 2, modifierBits: 0 },
};

// ---------- Query loading ----------

let _query: InstanceType<typeof import("tree-sitter").Query> | null = null;

function getHighlightsQuery(): InstanceType<typeof import("tree-sitter").Query> {
  if (_query) return _query;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Parser = require("tree-sitter");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Satsuma = require("tree-sitter-satsuma");
  const fs = require("fs");
  const path = require("path");

  // Resolve highlights.scm relative to tree-sitter-satsuma package
  const satsumaDir = path.dirname(require.resolve("tree-sitter-satsuma/package.json"));
  const queryPath = path.join(satsumaDir, "queries", "highlights.scm");
  const querySource = fs.readFileSync(queryPath, "utf8");

  _query = new Parser.Query(Satsuma, querySource);
  return _query!;
}

// ---------- Public API ----------

/**
 * Compute semantic tokens from a tree-sitter parse tree using highlights.scm.
 *
 * Returns encoded tokens suitable for the LSP semanticTokens/full response.
 */
export function computeSemanticTokens(tree: Tree): { data: number[] } {
  const query = getHighlightsQuery();
  const captures = query.captures(tree.rootNode);

  // Sort captures by position (row, then column) — tree-sitter captures
  // should already be ordered, but ensure it for the delta encoding.
  captures.sort((a: { node: SyntaxNode }, b: { node: SyntaxNode }) => {
    const rowDiff = a.node.startPosition.row - b.node.startPosition.row;
    if (rowDiff !== 0) return rowDiff;
    return a.node.startPosition.column - b.node.startPosition.column;
  });

  // Deduplicate: when multiple captures match the same span, keep the first
  // (most specific due to highlights.scm ordering).
  const seen = new Set<string>();
  const builder = new SemanticTokensBuilder();

  for (const capture of captures as Array<{ name: string; node: SyntaxNode }>) {
    const mapping = CAPTURE_MAP[capture.name];
    if (!mapping) continue;

    const node = capture.node;
    const key = `${node.startPosition.row}:${node.startPosition.column}:${node.endPosition.row}:${node.endPosition.column}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Semantic tokens are single-line in the LSP protocol.
    // For multi-line nodes (like multiline strings), emit one token per line.
    const startRow = node.startPosition.row;
    const endRow = node.endPosition.row;

    if (startRow === endRow) {
      const length = node.endPosition.column - node.startPosition.column;
      if (length > 0) {
        builder.push(
          startRow,
          node.startPosition.column,
          length,
          mapping.typeIndex,
          mapping.modifierBits,
        );
      }
    } else {
      // Multi-line token: emit first line from start to end-of-line,
      // and last line from 0 to end column.  We skip interior lines
      // for simplicity — they'll fall back to TextMate scoping.
      const sourceLines = node.text.split("\n");
      for (let i = 0; i < sourceLines.length; i++) {
        const line = startRow + i;
        const col = i === 0 ? node.startPosition.column : 0;
        const len = sourceLines[i]!.length;
        if (len > 0) {
          builder.push(line, col, len, mapping.typeIndex, mapping.modifierBits);
        }
      }
    }
  }

  return builder.build();
}
