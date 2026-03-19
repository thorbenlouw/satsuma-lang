---
id: stm-v9yc
status: closed
deps: []
links: []
created: 2026-03-19T08:36:37Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [parser, tree-sitter]
---
# Parser: inner double quotes inside triple-quoted strings cause parse errors

The tree-sitter parser chokes on inner double quotes inside triple-quoted strings ("""). The spec (section 2.2) explicitly states: 'No escaping needed for inner double quotes' in triple-quoted strings.

## Acceptance Criteria

- Inner `"` characters inside `"""..."""` blocks do not cause parse errors
- Reproduce: `stm validate features/06-data-modelling-with-stm/example_datavault/link-inventory.stm` (lines 14-15, content: `"as-of"` and `"Which warehouses..."`)
- Tree-sitter corpus test added for inner quotes inside triple-quoted strings


## Notes

**2026-03-19T08:38:15Z**

Duplicate of stm-eq1n (already closed/fixed). Inner quotes in triple-quoted strings parse correctly now.
