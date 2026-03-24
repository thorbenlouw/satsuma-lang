---
id: sl-2uzd
status: closed
deps: [sl-zf33]
links: []
created: 2026-03-24T18:29:37Z
type: task
priority: 1
assignee: Thorben Louw
tags: [feat-20, phase-1]
---
# Transform, metric, note, and import formatting

Implement formatting for transform_block, metric_block, note_block, and import_decl nodes. These follow standard brace/indentation rules. Imports grouped tightly (no blank lines between them).

## Acceptance Criteria

- [ ] transform_block formatted with correct indentation and brace rules
- [ ] metric_block formatted with source references and expressions
- [ ] note_block formatted, triple-quoted strings preserved verbatim
- [ ] import_decl: no blank lines between consecutive imports
- [ ] Single-line vs multi-line decisions apply (80 char threshold)
- [ ] Tests for each block type


## Notes

**2026-03-24T19:08:41Z**

Cause: New feature. Fix: Implemented transform_block (pipe chain body), metric_block (field alignment + nested notes), note_block (nl_string + multiline_string), import_decl, namespace_block formatting. 55 tests passing.
