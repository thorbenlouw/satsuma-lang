---
id: sl-fiqs
status: open
deps: [sl-o4by, sl-z6ps]
links: []
created: 2026-03-30T18:25:14Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-jvwu
tags: [lsp, core]
---
# lsp: migrate semantic-diagnostics.ts to use core collectSemanticDiagnostics()

The LSP's semantic-diagnostics.ts implements its own diagnostic logic (computeMissingImportDiagnostics) rather than using core's collectSemanticDiagnostics(). The CLI already delegates to core for validation via its validate.ts shim. The LSP should do the same.

Additionally, validate-diagnostics.ts shells out to the CLI (satsuma validate --json) for validation — an expensive subprocess spawn for every file change. Once the LSP has a proper workspace index built from core types, it can call core's collectSemanticDiagnostics() directly via the SemanticIndex interface, eliminating the CLI subprocess.

**Work:**
1. Wire the LSP's WorkspaceIndex to implement core's SemanticIndex interface (or create an adapter).
2. Call core's collectSemanticDiagnostics() directly from the LSP server.
3. Map SemanticDiagnostic[] to LSP Diagnostic[] (similar to CLI's validate.ts shim).
4. Evaluate whether validate-diagnostics.ts (CLI subprocess) can be removed entirely or kept as a fallback.
5. Keep computeMissingImportDiagnostics() if it covers cases that core validation doesn't — but document the gap.
6. Move validation tests to core where they test rule correctness; keep only mapping tests in LSP.

**Validation before PR:**
- LSP diagnostics match CLI diagnostics for all example files
- Performance improved (no subprocess spawn)
- Code meets AGENTS.md standards

## Acceptance Criteria

- LSP calls core collectSemanticDiagnostics() directly
- SemanticIndex adapter created for LSP WorkspaceIndex
- CLI subprocess validation removed or clearly documented as fallback
- Diagnostics consistent between CLI and LSP
- Validation rule tests consolidated in core

