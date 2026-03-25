---
id: lsp-z0sq
status: open
deps: [lsp-um8v, lsp-yli5]
links: []
created: 2026-03-25T17:29:21Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-3, grammar]
---
# P3.1: Metadata simplification in grammar

Replace 13 _kv_value choices with value_text greedy rule. Keep enum_body, slice_body, note_tag as structured. Remove kv_braced_list, kv_comparison, kv_ref_on, kv_compound etc.

## Acceptance Criteria

- Grammar has _metadata_entry with 5 choices: enum_body, slice_body, note_tag, tag_with_value, tag_token
- value_text is repeat1 of basic token types
- Commas and ) naturally terminate value_text
- tree-sitter generate succeeds
- No conflicts or ambiguities

