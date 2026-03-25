---
id: lsp-vm73
status: open
deps: [lsp-ijzz]
links: []
created: 2026-03-25T17:29:21Z
type: chore
priority: 2
assignee: Thorben Louw
tags: [phase-3, grammar]
---
# P3.5: Update all corpus test CST expectations

Rewrite corpus test CST expectations for simplified metadata, pipe step, and map entry node types.

## Acceptance Criteria

- All corpus tests pass with new CST node types
- tree-sitter test exits 0
- No S-expression references to removed node types (kv_comparison, arithmetic_step, token_call, etc.)

