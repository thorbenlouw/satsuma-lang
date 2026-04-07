---
id: sl-d20o
status: closed
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


## Notes

**2026-04-07T15:20:24Z**

Cause: Load-bearing extraction tests asserted one field at a time, missing drift in default values, optional-key presence, and unexpected extra fields. Fix: Converted 10 canonical-shape tests in tooling/satsuma-core/test/extract.test.js (extractSchemas basic + namespace, extractMappings basic + backtick-quoted, extractFragments, extractImports, extractMetrics basic + grain, extractTransforms, extractNotes top-level) to assert.deepStrictEqual against full expected objects, and added a header convention note explaining when to use full-shape vs single-property assertions. All 336 satsuma-core tests pass.
