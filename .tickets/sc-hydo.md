---
id: sc-hydo
status: closed
deps: [sc-xuu8, sc-xnhw]
links: []
created: 2026-03-22T20:17:29Z
type: task
priority: 2
assignee: Thorben Louw
parent: sc-v2pn
tags: [grammar, tests]
---
# Update tree-sitter fixture tests

Update all fixture JSON files under test/fixtures/examples/ after examples are migrated. Verify test_fixtures.py passes.

## Acceptance Criteria

python3 test_fixtures.py exits 0. All example fixtures pass.


## Notes

**2026-03-22T20:37:38Z**

**2026-03-22T21:48:00Z**

Cause: Fixture tests needed verification after grammar and example migration.
Fix: All 21 fixture tests pass as-is — no fixture JSON changes needed since they only verify parse success (no ERROR/MISSING nodes), not specific node types. (commit f1bcabb already covers the examples)
