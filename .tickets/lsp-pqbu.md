---
id: lsp-pqbu
status: closed
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


## Notes

**2026-03-26T01:46:13Z**

**2026-03-26T19:00:00Z**
Cause: Corpus tests and integration tests used single-quoted labels.
Fix: Converted all single-quoted labels to backtick labels across corpus tests, CLI integration tests, LSP tests, example files, and TextMate fixtures. Updated TextMate block-label pattern to use backtick-identifier instead of string-single.
