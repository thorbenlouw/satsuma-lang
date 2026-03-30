import {
  Diagnostic,
  DiagnosticSeverity,
} from "vscode-languageserver";
import type { Tree } from "./parser-utils";
import type { WorkspaceIndex } from "./workspace-index";
import {
  getImportReachableUris,
  createScopedIndex,
  buildImportSuggestion,
} from "./workspace-index";

/**
 * Compute semantic diagnostics for import-scoping violations.
 *
 * Emits a `missing-import` error for any schema/fragment/mapping/metric name
 * that is referenced in this file (as a source, target, spread, or metric
 * source) and exists elsewhere in the workspace index but is NOT reachable
 * from this file's import graph.
 *
 * Symbols that don't exist anywhere (typos, etc.) are not flagged here —
 * those are handled by `satsuma validate` diagnostics.
 */
export function computeMissingImportDiagnostics(
  _tree: Tree,
  uri: string,
  wsIndex: WorkspaceIndex,
): Diagnostic[] {
  const reachableUris = getImportReachableUris(uri, wsIndex);
  const scopedIndex = createScopedIndex(wsIndex, reachableUris);

  const diagnostics: Diagnostic[] = [];

  for (const [name, refs] of wsIndex.references) {
    // Only consider references that come from this file and are structural
    // (source/target/spread/metric_source) — not arrow field paths or import names
    const fileRefs = refs.filter(
      (r) =>
        r.uri === uri &&
        (r.context === "source" ||
          r.context === "target" ||
          r.context === "spread" ||
          r.context === "metric_source"),
    );
    if (fileRefs.length === 0) continue;

    const globalDefs = wsIndex.definitions.get(name);
    // If not defined anywhere, let `satsuma validate` handle it
    if (!globalDefs || globalDefs.length === 0) continue;

    const scopedDefs = scopedIndex.definitions.get(name);
    // Already reachable via imports — no problem
    if (scopedDefs && scopedDefs.length > 0) continue;

    // Symbol exists in workspace but is not reachable from this file's import graph
    const defUri = globalDefs[0]!.uri;
    const suggestion = buildImportSuggestion(uri, name, defUri);

    for (const ref of fileRefs) {
      diagnostics.push({
        range: ref.range,
        severity: DiagnosticSeverity.Error,
        code: "missing-import",
        source: "satsuma",
        message: `'${name}' is not imported. Add: ${suggestion}`,
      });
    }
  }

  return diagnostics;
}
