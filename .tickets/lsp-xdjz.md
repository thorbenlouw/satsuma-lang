---
id: lsp-xdjz
status: open
deps: [lsp-ulfa]
links: []
created: 2026-03-25T17:28:23Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-1, cli]
---
# P1.3: Update index-builder.ts for qualified keys

Update workspace index to store and look up schemas/fields by canonical qualified keys.

## Acceptance Criteria

- Index keys use canonical ::schema or ns::schema format
- Lookups by canonical key work
- Tests updated

