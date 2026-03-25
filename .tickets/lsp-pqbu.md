---
id: lsp-pqbu
status: open
deps: [lsp-asfn]
links: []
created: 2026-03-25T17:36:08Z
type: chore
priority: 2
assignee: Thorben Louw
tags: [phase-4, grammar]
---
# P4.2: Update corpus tests for backtick labels

Replace all 'label' with `label` in corpus test files.

## Acceptance Criteria

- No single-quote labels in corpus tests
- All corpus tests pass
- tree-sitter test exits 0

