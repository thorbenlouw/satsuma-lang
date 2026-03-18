---
id: stm-y9a1
status: closed
deps: [stm-j51n]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 8: Note blocks

Parse note { "..." } and note { """...""" }. note_block contains string_literal or multiline_string. Valid at file top level and inside mapping/metric bodies. Add corpus test/corpus/notes.txt.

## Acceptance Criteria

- note blocks parse with both string types
- Valid in all expected positions
- test/corpus/notes.txt passes

