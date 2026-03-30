/**
 * validate.ts — CLI adapter for semantic validation
 *
 * Delegates all semantic checks to @satsuma/core/validate, which is the
 * single source of truth for the validation rules. This file maps the output
 * (SemanticDiagnostic[]) to the CLI's LintDiagnostic type, which adds a
 * fix-function slot not needed by the semantic checks.
 *
 * Structural checks (CST ERROR/MISSING nodes from tree-sitter) are handled
 * separately in commands/validate.ts using collectParseErrors from core.
 */

import { collectSemanticDiagnostics } from "@satsuma/core";
import type { SemanticDiagnostic } from "@satsuma/core";
import type { LintDiagnostic, WorkspaceIndex } from "./types.js";

/**
 * Run semantic checks against a workspace index, returning CLI LintDiagnostic objects.
 * All checks are implemented in @satsuma/core/validate; this wrapper adapts the output.
 */
export function collectSemanticWarnings(index: WorkspaceIndex): LintDiagnostic[] {
  const semanticDiags = collectSemanticDiagnostics(index);
  return semanticDiags.map(toCLIDiagnostic);
}

/** Map a plain SemanticDiagnostic to the CLI's LintDiagnostic (adds fixable flag). */
function toCLIDiagnostic(d: SemanticDiagnostic): LintDiagnostic {
  return {
    file: d.file,
    line: d.line,
    column: d.column,
    severity: d.severity,
    rule: d.rule,
    message: d.message,
    fixable: false,
  };
}
