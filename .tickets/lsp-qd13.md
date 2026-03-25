---
id: lsp-qd13
status: open
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

