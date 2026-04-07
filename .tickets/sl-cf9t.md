---
id: sl-cf9t
status: closed
deps: []
links: []
created: 2026-03-31T08:29:54Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: dependency reachability is too broad — flat transitive scope leaks unrelated symbols

The CLI makes transitively imported symbols visible too broadly. The intended rule is narrower: importing a symbol should make that symbol and its exact transitive dependencies reachable, but not unrelated symbols elsewhere in the imported file graph.

Repro:
  # base.stm defines 'my_transform'
  # middle.stm: import { my_transform } from './base.stm'
  # top.stm: import { middle_schema } from './middle.stm'  (does NOT import my_transform)
  # top.stm uses my_transform in a mapping arrow
  cd /tmp/satsuma-test-ns-import/transitive
  satsuma validate top.stm
  # Output: Validated 3 files: no issues found.

Expected: validate should report that my_transform is not in scope unless it is actually reachable as a dependency of what `top.stm` imported.

This also affects fragment spreads: a file can use ...base_fields from a transitively imported file without importing it directly when that fragment is not actually part of the imported symbol's dependency graph. The CLI appears to treat the whole transitive graph as a flat scope.

## Notes

**2026-03-31**

Re-opened. Prior triage was wrong: Satsuma keeps explicit imports, but imported symbols bring their exact transitive dependencies with them. The bug is that the current implementation appears broader than that and leaks unrelated symbols through a flat transitive scope. ADR-022 now describes the narrower dependency-reachability model; implementation is still needed.

**2026-04-01**

Bug confirmed still reproducible against current main. The root cause is in `buildIndex` — all transitively reachable files are merged into a flat scope with no import-boundary enforcement. Both the CLI validator and the LSP diagnostic engine (and likely completions/hover) consume this same flat index, so both are affected.

Implementation guidance: the fix should live in `satsuma-core` so CLI and LSP share exactly the same reachability logic and cannot diverge. The index can remain flat (it is useful for cross-file lookups), but a per-file **reachability set** needs to be computed from the import graph and threaded into validation so that undefined-ref checks only consider symbols actually reachable from the file being validated. Placing this in core prevents a repeat of the pattern where the same rule is implemented independently in the CLI and LSP and drifts over time.

**2026-04-02**

Partial implementation audit: the LSP already has `computeMissingImportDiagnostics` in `semantic-diagnostics.ts` which performs a scope check using `getImportReachableUris` + `createScopedIndex`. However this is **file-level scope** (any symbol in any transitively reachable file is considered in scope), not symbol-level scope. It would not catch the repro: `top.stm` imports `{ middle_schema }` from `middle.stm`; `base.stm` IS transitively reachable (via `middle.stm`'s import), so the file-level check passes — but `my_transform` is not a dependency of `middle_schema`, so it should not be in scope for `top.stm`.

Current state:
- LSP: partial implementation (file-level scope via `computeMissingImportDiagnostics`) — would not catch the repro
- CLI: no import scope check at all
- satsuma-core: no reachability logic yet — this is where it should live per the note above

The full fix requires symbol-level reachability computation in `satsuma-core`: given a root file and its import graph, compute which symbols are reachable from each file (the imported symbol plus its own transitive declared dependencies), then thread that set into `collectSemanticDiagnostics` so undefined-ref checks are bounded to that set. This is genuinely new work — deferred to a dedicated implementation PR.

**2026-04-02T10:19:48Z**

Cause: buildIndex merged all transitively reachable files into a flat scope with no import-boundary enforcement. Any symbol in any file reachable via the import graph was visible everywhere, violating ADR-022's rule that imports bring only the named symbols and their exact transitive dependencies into scope.

Fix: Added import-reachability.ts to satsuma-core with computeSymbolDependencies() (builds intra-workspace dependency graph) and computeImportReachability() (computes per-file reachable symbol sets from import declarations). Extended collectSemanticDiagnostics to accept optional ImportReachability and added a new 'import-scope' check (Section 9) that flags references to symbols that exist in the workspace but are not reachable from the file's imports. Wired up in the CLI by populating fileImports in buildIndex and computing reachability in collectSemanticWarnings. 16 new tests (5 dependency graph, 7 reachability algorithm, 4 CLI integration). All 880 existing tests pass.

**2026-04-02T10:58:00Z**

Cause: The PR branch still had unused locals in `tooling/satsuma-cli/test/import-reachability.test.ts`, so the root `eslint .` step failed even though the functional change was already correct.
Fix: Removed two dead test fixtures and renamed intentionally ignored CLI exit-code bindings to `_code` so the test file remains explicit without tripping `@typescript-eslint/no-unused-vars`. Re-ran the focused import-reachability tests and the full root lint suite.

**2026-04-07T09:48:34Z**

**2026-04-07T00:00:00Z**

Cause: buildIndex merged transitively reachable files into a flat scope, with no enforcement that imported symbols only bring their exact transitive dependencies into scope (ADR-022).
Fix: Symbol-level reachability now lives in satsuma-core (computeImportReachability + computeSymbolDependencies) and is consumed by both the CLI validator (collectSemanticWarnings) and the LSP (computeMissingImportDiagnostics in tooling/satsuma-lsp/src/semantic-diagnostics.ts), so the two consumers cannot drift. Original repro covered by tooling/satsuma-cli/test/import-reachability.test.ts:243 (\"sl-cf9t repro\"). Verified via audit on 2026-04-07.
