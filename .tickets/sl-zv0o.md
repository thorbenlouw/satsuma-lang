---
id: sl-zv0o
status: open
deps: []
links: []
created: 2026-04-07T09:42:54Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# tests: add error-recovery integration tests

Grammar produces MISSING nodes on broken input but no integration test verifies CLI/LSP behavior on recovered trees. Add ≥3 CLI and ≥3 LSP tests. Feature 29 TODO #12.

## Acceptance Criteria

≥6 new tests covering recovered-tree behavior; all assert graceful (non-crash) output.

