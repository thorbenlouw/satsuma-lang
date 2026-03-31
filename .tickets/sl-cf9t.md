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
