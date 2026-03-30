---
id: sl-pcgg
status: open
deps: [sl-qe6b, sl-bdg6]
links: []
created: 2026-03-30T06:29:23Z
type: chore
priority: 3
assignee: Thorben Louw
---
# move semantic validation logic into @satsuma/core/validate

The bulk of Satsuma semantic validation (~350 lines) lives in satsuma-cli/src/validate.ts (collectSemanticWarnings): duplicate detection, fragment spread resolution, mapping source/target existence, NL @ref validation, arrow field-in-schema checks, transform spread resolution, ref metadata checks, etc.

The LSP server has no independent implementation — it shells out to 'satsuma validate --json' and parses stdout. This works but adds subprocess overhead on every save, and the logic is inaccessible to future tools or a satsuma-core API consumer.

## Design

Move collectSemanticWarnings (and its helpers) to satsuma-core/src/validate.ts as a pure function:
  collectSemanticDiagnostics(index: WorkspaceIndex): SemanticDiagnostic[]

Where SemanticDiagnostic is a plain data type (file, line, column, message, severity) — no CLI-specific types.

CLI validate.ts maps SemanticDiagnostic[] to its LintDiagnostic output format (trivial).
LSP validate-diagnostics.ts can call the function in-process instead of spawning a subprocess. The subprocess path can remain as a fallback during migration.

Requires WorkspaceIndex (or a compatible abstract interface) to be importable from core — coordinate with any workspace index consolidation work.

## Acceptance Criteria

**Correctness**
- @satsuma/core exports collectSemanticDiagnostics and SemanticDiagnostic
- CLI validate.ts delegates to core; its own logic removed
- LSP validate-diagnostics.ts calls core function in-process; subprocess no longer needed
- All existing validation test cases (golden snapshots etc.) continue to pass

**Code quality**
- validate.ts is structured as a readable document: top-level comment explains the validation model (what kinds of errors it catches and why they aren't detectable at parse time); each check group (duplicates, missing refs, field checks, etc.) has a section comment explaining the invariant being enforced
- SemanticDiagnostic is a clean plain-data type with doc-comments on each field — no CLI or LSP types leak into core
- Helper functions are small, named for what they assert, and sit adjacent to the check that uses them

**Tests**
- satsuma-core/test/validate.test.js has one focused describe block per diagnostic category; existing CLI golden-snapshot tests that were effectively re-testing core logic are retired in favour of the direct unit tests
- Every test case has a leading comment explaining the rule under test and the failure mode it guards against (e.g. "duplicate schema names must be reported even when declarations appear in different files — the index is workspace-scoped, not file-scoped")
- Test inputs are minimal valid/invalid Satsuma snippets, not copies of full example files — keeps tests fast and their intent obvious
- No test exists only to confirm a function returns without throwing; every case asserts a specific diagnostic is or is not present

