---
id: lsp-ijzz
status: closed
deps: [lsp-qd13]
links: []
created: 2026-03-25T17:29:21Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-3, grammar]
---
# P3.4: Unified escaping + @ref in grammar

Align backtick_name and nl_string escape patterns. Add @ as optional prefix in identifier positions (allowed everywhere, required only in NL for tooling). Add \@ escape in NL strings.

## Acceptance Criteria

- backtick_name and nl_string use identical \\[\\s\\S] escape pattern
- @ prefix accepted in identifier positions without error
- @ref in NL strings creates an at_ref CST node (or similar)
- \@ in NL strings produces literal @
- tree-sitter generate succeeds


## Notes

**2026-03-26T01:12:18Z**

**2026-03-26T16:00:00Z**

Cause: Escape patterns were already unified between backtick_name and nl_string (both use \\. pattern). Grammar lacked structural @ref support for cross-references.
Fix: Added at_ref grammar rule (@identifier, @schema.field, @ns::schema.field, @`backtick`.field) to pipe_text and value_text. The rule is additive — no existing syntax changes. \@ in NL strings already works via the existing \\. escape pattern.
