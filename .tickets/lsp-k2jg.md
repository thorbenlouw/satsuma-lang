---
id: lsp-k2jg
status: closed
deps: [lsp-ar7x]
links: []
created: 2026-03-25T17:29:21Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-3, vscode]
---
# P3.10: Update TextMate grammar for simplified rules

Update satsuma.tmLanguage.json patterns for simplified metadata, pipe steps, and @ref highlighting.

## Acceptance Criteria

- @ref highlighted distinctly in NL strings
- Pipe text highlighted as NL content
- Simplified metadata values highlighted correctly
- TextMate grammar validates


## Notes

**2026-03-26T01:20:06Z**

**2026-03-26T17:00:00Z**

Cause: TextMate grammar lacked @ref highlighting in NL strings.
Fix: Added @ref pattern (variable.other.reference.satsuma) to string-double rule matching @identifier, @schema.field, @ns::schema.field, and @`backtick`.field patterns. Existing pipe text and metadata highlighting works with the simplified grammar since the TextMate patterns match on surface syntax, not CST node types.
