---
id: lsp-vm73
status: closed
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


## Notes

**2026-03-26T01:14:08Z**

**2026-03-26T16:15:00Z**

Cause: Corpus tests needed updating for simplified CST node types.
Fix: Already completed as part of P3.1 (lsp-z0sq), P3.2 (lsp-lk1w), P3.3 (lsp-qd13), and P3.4 (lsp-ijzz). All 254 corpus tests pass with new node types. No S-expression references to removed types remain (only a test name string "Single token_call step" in transforms.txt).
