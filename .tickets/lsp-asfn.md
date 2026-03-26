---
id: lsp-asfn
status: closed
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


## Notes

**2026-03-26T01:27:08Z**

**2026-03-26T18:00:00Z**

Cause: Grammar had quoted_name (single-quote) rule for block labels, import names, and spread labels.
Fix: Replaced all quoted_name references with backtick_name in grammar (block_label, import_name, spread_label). Removed quoted_name terminal rule. Updated all CLI source files (12 files), LSP source (4 files), query files (2), corpus tests (48 tests across 14 files), example files (20 .stm files), and unit test mock helpers. Integration test snapshot expectations need further updates (P4.2-P4.6 scope).
