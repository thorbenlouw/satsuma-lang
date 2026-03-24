import {
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticTag,
} from "vscode-languageserver";
import type { SyntaxNode, Tree } from "./parser-utils";
import { nodeRange } from "./parser-utils";

/**
 * Produce LSP diagnostics from a tree-sitter parse tree.
 *
 * - ERROR / MISSING nodes → Error severity
 * - warning_comment (//!) → Warning severity
 * - question_comment (//?…) → Information severity
 */
export function computeDiagnostics(tree: Tree): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  walkErrors(tree.rootNode, diagnostics);
  walkComments(tree.rootNode, diagnostics);
  return diagnostics;
}

/** Recursively collect ERROR and MISSING nodes. */
function walkErrors(node: SyntaxNode, out: Diagnostic[]): void {
  if (node.type === "ERROR") {
    out.push({
      range: nodeRange(node),
      severity: DiagnosticSeverity.Error,
      source: "satsuma",
      message: "Syntax error",
    });
    // Don't recurse into ERROR children — the parent ERROR is enough context
    return;
  }

  if (node.isMissing) {
    out.push({
      range: nodeRange(node),
      severity: DiagnosticSeverity.Error,
      source: "satsuma",
      message: `Expected ${node.type}`,
    });
    return;
  }

  for (const child of node.namedChildren) {
    walkErrors(child, out);
  }
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
