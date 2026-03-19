---
id: stm-eq1n
status: closed
deps: []
links: [stm-7rz4]
created: 2026-03-19T07:16:41Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [parser, feature-13]
---
# Fix triple-quoted strings with embedded double quotes

The multiline_string grammar rule rejects any double-quote inside triple-quoted strings. Real-world notes (Feature 06 examples) contain embedded quotes. Affects 5 files with 9 parse errors.

## Acceptance Criteria

Triple-quoted strings with embedded double-quote characters parse correctly. All affected files (link-inventory.stm, link-sale.stm, mart-sales.stm, fact-sales.stm, fact-inventory.stm) parse without errors from this bug.

