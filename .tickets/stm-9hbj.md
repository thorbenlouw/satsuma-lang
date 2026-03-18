---
id: stm-9hbj
status: open
deps: [stm-6lq1, stm-jbba]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 12: Error recovery corpus

Add test/corpus/recovery.txt with malformed inputs and expected partial trees: missing closing }, unterminated multiline string, arrow with missing target path, unclosed metadata (, malformed map entry, metric with no metadata block.

## Acceptance Criteria

- recovery.txt covers all 6 error cases
- Partial trees match expectations
- tree-sitter test passes

