---
id: lsp-d4yk
status: open
deps: [lsp-9p9g]
links: []
created: 2026-03-25T17:36:36Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-5, cli]
---
# P5.3: Emit @ref edges in graph-builder

Update graph-builder.ts to emit @ref edges as first-class schema_edges in satsuma graph --json output.

## Acceptance Criteria

- @ref mentions in NL produce edges in schema_edges
- Edges marked with nl-ref source type
- graph --json tests updated

