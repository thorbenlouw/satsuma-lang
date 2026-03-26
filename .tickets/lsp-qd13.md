---
id: lsp-qd13
status: closed
deps: [lsp-lk1w]
links: []
created: 2026-03-25T17:29:21Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-3, grammar]
---
# P3.3: Map entry simplification in grammar

Replace structured map_key/map_value with map_key_text : map_value_text greedy capture.

## Acceptance Criteria

- Map keys consume until :
- Map values consume until , or }
- No external scanner needed
- tree-sitter generate succeeds


## Notes

**2026-03-26T01:09:01Z**

**2026-03-26T15:30:00Z**

Cause: Map entry grammar had 7 structured key types and 5 value types, more complexity than needed since the CLI doesn't evaluate map logic.
Fix: Changed map_key and map_value from choice() to repeat1(choice()) greedy rules. Keys consume tokens until :, values until , or }. Added prec.left to resolve repeat ambiguity. Updated corpus tests including recovery tests with MISSING nodes.
