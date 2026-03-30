---
id: sl-qe6b
status: open
deps: []
links: []
created: 2026-03-30T06:29:09Z
type: chore
priority: 2
assignee: Thorben Louw
---
# consolidate ERROR/MISSING node collection into @satsuma/core/diagnostics

satsuma-cli/src/validate.ts (collectParseErrors / walkErrors) and vscode-satsuma/server/src/diagnostics.ts (computeDiagnostics / walkErrors) both walk the CST looking for ERROR and MISSING nodes. The traversal logic is nearly identical; only the output type differs — the CLI returns LintDiagnostic[] (its own type) and the LSP returns VSCode Diagnostic[].

Duplication means a bug in the walk (e.g. missing isMissing handling) must be fixed in two places, and the two implementations can silently drift.

## Design

Add satsuma-core/src/parse-errors.ts:
- ParseErrorEntry { message: string; startLine: number; startColumn: number; endLine: number; endColumn: number; isMissing: boolean }
- collectParseErrors(tree: Tree): ParseErrorEntry[]

Both CLI and LSP call collectParseErrors(), then map the result to their native diagnostic type (LintDiagnostic and vscode.Diagnostic respectively). The mapping is trivial — 3-4 lines each.

Remove the duplicated walk implementations from validate.ts and diagnostics.ts.

## Acceptance Criteria

**Correctness**
- @satsuma/core exports collectParseErrors and ParseErrorEntry
- CLI validate.ts uses core function; its own walkErrors removed
- LSP diagnostics.ts uses core function; its own walkErrors removed
- All existing CLI and LSP diagnostic tests pass

**Code quality**
- parse-errors.ts is literate: a module-level comment explains what ERROR vs MISSING nodes mean in a tree-sitter CST and why both must be collected; each exported type and function has a doc-comment
- No vestigial walkErrors copies remain anywhere in the codebase

**Tests**
- satsuma-core/test/parse-errors.test.js is the canonical suite; any CLI or LSP tests that were re-testing the same walk logic are removed (not duplicated)
- Each test case has a leading comment stating *why* the scenario is worth testing (e.g. "MISSING nodes are inserted by the error-recovery parser and carry no source text — they must be reported as separate diagnostic entries from ERROR nodes")
- Cases cover: clean parse tree returns empty array, single top-level ERROR node, MISSING node inserted mid-parse, ERROR and MISSING nodes nested inside valid structure
- Tests are written against real parsed Satsuma source snippets, not mock SyntaxNode objects — validates end-to-end fidelity

