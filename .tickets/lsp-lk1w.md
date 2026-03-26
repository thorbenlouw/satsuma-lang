---
id: lsp-lk1w
status: closed
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


## Notes

**2026-03-26T01:03:01Z**

**2026-03-26T14:00:00Z**

Cause: Pipe step grammar had 6 specialized node types (arithmetic_step, token_call, _tc_arg, plus nl_string/multiline_string as direct pipe_step children) creating unnecessary complexity.
Fix: Replaced pipe_step choices with fragment_spread | map_literal | pipe_text (greedy repeat1). Removed arithmetic_step, token_call, _tc_arg. Updated highlights query, CLI code (classify.ts, format.ts, where-used.ts, nl-extract.ts, nl-ref-extract.ts, graph.ts, extract.ts, meta-extract.ts, find.ts, metric.ts), LSP code (hover.ts), all affected corpus tests, unit tests, and formatted examples.
