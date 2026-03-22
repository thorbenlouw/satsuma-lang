---
id: sc-yrpd
status: closed
deps: [sc-hydo, sc-t81t, sc-8lt4, sc-nhoi, sc-pold]
links: []
created: 2026-03-22T20:18:01Z
type: task
priority: 1
assignee: Thorben Louw
parent: sc-v2pn
tags: [validation]
---
# Full repo validation for unified syntax

Run scripts/run-repo-checks.sh. Verify all tree-sitter corpus, CLI, and fixture tests pass. Grep all .stm and .md files to confirm no old syntax remains.

## Acceptance Criteria

run-repo-checks.sh exits 0. No old syntax patterns found anywhere.


## Notes

**2026-03-22T21:19:48Z**

**2026-03-23T00:35:00Z**

Cause: Full repo validation needed after unified field syntax migration.
Fix: All tests pass: 241 tree-sitter corpus, 21 fixtures, 624 CLI tests. All 17 example files parse cleanly. Zero old-syntax patterns (keyword-first record/list, []) remain in examples.
