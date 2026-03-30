import {
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticTag,
} from "vscode-languageserver";
import type { SyntaxNode, Tree } from "./parser-utils";
import { nodeRange } from "./parser-utils";
import { collectParseErrors } from "@satsuma/core";

/**
 * Produce LSP diagnostics from a tree-sitter parse tree.
 *
 * - ERROR / MISSING nodes → Error severity (via collectParseErrors from @satsuma/core)
 * - warning_comment (//!) → Warning severity
 * - question_comment (//?…) → Information severity
 */
export function computeDiagnostics(tree: Tree): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Map core's ParseErrorEntry[] to LSP Diagnostic[].
  for (const e of collectParseErrors(tree)) {
    diagnostics.push({
      range: {
        start: { line: e.startRow, character: e.startColumn },
        end: { line: e.endRow, character: e.endColumn },
      },
      severity: DiagnosticSeverity.Error,
      source: "satsuma",
      message: e.message,
    });
  }

  walkComments(tree.rootNode, diagnostics);
  return diagnostics;
}

/** Collect //! and //? comments as diagnostics. */
function walkComments(node: SyntaxNode, out: Diagnostic[]): void {
  // Comments are "extra" nodes in tree-sitter — they can appear at any level.
  // Walk all children (not just named) to find them.
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (!child) continue;

    if (child.type === "warning_comment") {
      out.push({
        range: nodeRange(child),
        severity: DiagnosticSeverity.Warning,
        source: "satsuma",
        message: child.text.replace(/^\/\/!\s*/, ""),
      });
    } else if (child.type === "question_comment") {
      out.push({
        range: nodeRange(child),
        severity: DiagnosticSeverity.Hint,
        source: "satsuma",
        message: `TODO: ${child.text.replace(/^\/\/\?\s*/, "")}`,
        tags: [DiagnosticTag.Unnecessary],
      });
    }

    // Recurse into structural nodes to find nested comments
    if (child.namedChildCount > 0) {
      walkComments(child, out);
    }
  }
}
