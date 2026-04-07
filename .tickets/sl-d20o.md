---
id: sl-d20o
status: open
deps: []
links: []
created: 2026-04-07T09:43:10Z
type: chore
priority: 3
assignee: Thorben Louw
parent: sl-63ix
---
# tests: tighten assertion style on highest-value tests

Convert ~10 most load-bearing extraction/classification tests from per-field assert.equal to deepStrictEqual against full expected objects. Document the convention. Feature 29 TODO #14.

## Acceptance Criteria

10 high-value tests use deepStrictEqual; convention noted in test file headers.

