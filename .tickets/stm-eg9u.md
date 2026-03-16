---
id: stm-eg9u
status: closed
deps: [stm-pzwn, stm-to29]
links: [stm-jruy, stm-2szj, stm-5pi1, stm-pzwn, stm-to29, stm-d281]
created: 2026-03-16T15:46:21Z
type: task
priority: 1
assignee: Thorben Louw
tags: [rename-mapping-keyword]
---
# Regenerate tree-sitter parser and verify all tests pass after mapping rename

After all corpus and support file changes are complete, regenerate the tree-sitter parser (tree-sitter generate), run tree-sitter test, run Python smoke/fixture tests, and parse all example .stm files to confirm zero regressions.

## Acceptance Criteria

tree-sitter generate succeeds. tree-sitter test passes all corpus tests. Python test_smoke_summary.py and test_fixtures.py pass. All examples/*.stm parse without unexpected errors.

