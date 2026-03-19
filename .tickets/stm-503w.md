---
id: stm-503w
status: closed
deps: []
links: []
created: 2026-03-19T08:36:34Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [parser, tree-sitter]
---
# Parser: triple-quoted strings inside metadata () blocks cause parse errors

The tree-sitter parser fails to parse triple-quoted strings (""") when they appear inside metadata parentheses. The spec (section 3.4) explicitly shows this as valid syntax: note """...""" inside a schema's () metadata block.

## Acceptance Criteria

- `note """..."""` inside schema metadata parens parses without errors
- Reproduce: `stm validate features/06-data-modelling-with-stm/example_datavault/link-inventory.stm` (line 47)
- Reproduce: `stm validate features/06-data-modelling-with-stm/example_datavault/link-sale.stm` (line 67)
- Tree-sitter corpus test added for triple-quoted note inside metadata


## Notes

**2026-03-19T08:38:14Z**

Duplicate of stm-eq1n (already closed/fixed). Triple-quoted strings in metadata parse correctly now.
