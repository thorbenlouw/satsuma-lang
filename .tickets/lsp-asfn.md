---
id: lsp-asfn
status: open
deps: [lsp-k2jg]
links: []
created: 2026-03-25T17:36:08Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-4, grammar]
---
# P4.1: Remove quoted_name from grammar

Replace quoted_name (single-quote) with backtick_name in block_label, import_name, spread_label positions. Remove the quoted_name terminal rule.

## Acceptance Criteria

- No quoted_name rule in grammar.js
- block_label, import_name, spread_label use backtick_name for non-bare names
- tree-sitter generate succeeds
- Single-quoted labels produce parse errors

