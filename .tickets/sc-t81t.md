---
id: sc-t81t
status: closed
deps: [sc-8chz, sc-1dli]
links: []
created: 2026-03-22T20:17:49Z
type: task
priority: 1
assignee: Thorben Louw
parent: sc-v2pn
tags: [cli, tests]
---
# Update CLI tests for unified syntax

Update all test fixtures and assertions referencing old syntax. Update bug-purge, graph, namespace tests. Add new tests for list_of, each, flatten handling.

## Acceptance Criteria

All 624+ CLI tests pass.


## Notes

**2026-03-22T21:07:58Z**

**2026-03-22T23:45:00Z**

Cause: Integration tests checked CLI output against old keyword-first syntax and [] path format.
Fix: Updated 10 test files and 5 fixture .stm files. Replaced record/list block references with unified field_decl pattern, removed [] from path assertions, adapted each_block/flatten_block assertions. All 624 tests pass. (commit b34392c)
