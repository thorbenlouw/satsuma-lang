---
id: sl-znn1
status: in_progress
deps: []
links: []
created: 2026-04-07T09:42:36Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# cleanup: consolidate duplicated utilities into satsuma-core

Audit CLI and LSP for duplicated utilities; move canonical impls (with tests) into satsuma-core; delete consumer copies. See feature 29 TODO #1.

## Acceptance Criteria

No utility function exists in two consumer packages. Dependency graph unchanged. All tests pass.

