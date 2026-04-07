---
id: sl-yk89
status: closed
deps: []
links: []
created: 2026-04-07T09:43:10Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# tests: strengthen LSP completion tests

completion.test.js has only 9 tests for one of the most context-dependent LSP features. Double count; add cases for source/target/pipe/metadata/namespace contexts and ≥2 cases for completion in MISSING-node trees. Feature 29 TODO #16.

## Acceptance Criteria

≥18 completion tests; ≥2 in recovered-tree state.


## Notes

**2026-04-07T15:38:07Z**

Cause: completion.test.js had only 9 cases for the most context-sensitive LSP feature. Fix: grew to 18 tests including arrow_target, namespace import, kind tagging, fragment/transform exclusion, plus 2 MISSING-node recovery cases.
