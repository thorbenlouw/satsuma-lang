import { FoldingRange, FoldingRangeKind } from "vscode-languageserver";
import type { SyntaxNode, Tree } from "tree-sitter";

/**
 * Foldable node types — mirrors folds.scm.
 *
 * These are the CST node types that define foldable regions in VS Code.
 */
const FOLDABLE_TYPES = new Set([
  "schema_block",
  "fragment_block",
  "transform_block",
  "mapping_block",
  "metric_block",
  "note_block",
  "namespace_block",
  "each_block",
  "flatten_block",
  "metadata_block",
  "nested_arrow",
  "map_literal",
]);

/**
 * Compute folding ranges from a tree-sitter parse tree.
 * Only multi-line nodes produce fold ranges.
 */
export function computeFoldingRanges(tree: Tree): FoldingRange[] {
  const ranges: FoldingRange[] = [];
  walk(tree.rootNode, ranges);
  return ranges;
}

function walk(node: SyntaxNode, out: FoldingRange[]): void {
  if (FOLDABLE_TYPES.has(node.type)) {
    const startLine = node.startPosition.row;
    const endLine = node.endPosition.row;
    if (endLine > startLine) {
      out.push({
        startLine,
        endLine,
        kind: FoldingRangeKind.Region,
      });
    }
  }

  for (const child of node.namedChildren) {
    walk(child, out);
  }
}
