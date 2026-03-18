---
id: stm-m3nx
status: closed
deps: [stm-mzwe]
links: []
created: 2026-03-18T12:18:41Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u65b
tags: [cli]
---
# Phase 12: End-to-end tests

Integration tests in tooling/stm-cli/test/ using examples/ as fixtures. Test each command with valid input, unknown names (exit 1), stm find --tag pii, stm lineage --from legacy_sqlserver, stm summary --json, stm context.

## Acceptance Criteria

- All commands tested with valid and invalid input
- Exit codes verified
- find/lineage/summary/context output verified
- All tests pass

