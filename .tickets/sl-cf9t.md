---
id: sl-cf9t
status: open
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
