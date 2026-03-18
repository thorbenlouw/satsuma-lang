---
id: stm-i0br
status: open
deps: [stm-j51n]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 9: Comments

Confirm line_comment (//), warning_comment (//!), and question_comment (//?): all appear as named extra nodes in CST, are distinct node types, and can appear after any statement and on own lines. Add corpus tests.

## Acceptance Criteria

- All three comment types are named nodes
- Each is a distinct node type
- Appear in expected positions
- Corpus tests pass

