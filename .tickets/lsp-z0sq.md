---
id: lsp-z0sq
status: closed
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


## Notes

**2026-03-26T00:36:24Z**

**2026-03-26T12:00:00Z**

Cause: Grammar had 13 _kv_value forms (boolean, numeric, dotted, comparison, ref-on, compound, braced list, etc.) creating excessive complexity for a language whose metadata is opaque text.
Fix: Replaced key_value_pair/kv_key/_kv_value with tag_with_value/value_text greedy rule. Removed kv_braced_list, kv_comparison, kv_ref_on, kv_compound. Kept enum_body, slice_body, note_tag as structured rules. Updated all 44 affected corpus tests and highlights query.
