---
id: lsp-l9aq
status: closed
deps: [lsp-ve2s]
links: []
created: 2026-03-25T17:36:08Z
type: task
priority: 2
assignee: Thorben Louw
tags: [phase-4, docs]
---
# P4.6: Update spec for backtick-only labels

Update SATSUMA-V2-SPEC.md sections 2.2 and 2.3 to document backtick-only quoting for labels.

## Acceptance Criteria

- No references to single-quote labels in spec
- Backtick vs bare identifier rules documented
- Examples updated throughout


## Notes

**2026-03-26T01:49:00Z**

**2026-03-26T19:30:00Z**

Cause: SATSUMA-V2-SPEC.md documented single-quoted labels as the quoting convention.
Fix: Updated sections 2.2 and 2.3 to document backtick-only quoting with two rules (backticks for names, double quotes for prose). Added @ref documentation. Converted all single-quoted Satsuma labels throughout the spec to backtick labels. Updated metric name description.
