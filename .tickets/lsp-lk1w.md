---
id: lsp-lk1w
status: open
deps: [lsp-z0sq]
links: []
created: 2026-03-25T17:29:21Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-3, grammar]
---
# P3.2: Pipe step simplification in grammar

Replace pipe_step choices with fragment_spread | map_literal | pipe_text. Remove arithmetic_step, token_call, _tc_arg.

## Acceptance Criteria

- pipe_text is repeat1 of basic tokens
- | and } terminate pipe_text naturally
- Double quotes still work for text containing | or }
- tree-sitter generate succeeds

