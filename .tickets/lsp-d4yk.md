---
id: lsp-d4yk
status: closed
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


## Notes

**2026-03-26T04:18:47Z**

Cause: NL @ref schema references were excluded from graph schema_edges by design (cbh-y5og).
Fix: Now that hidden-source-in-nl is an error (P5.1), NL refs represent intentional lineage. Added nl_ref edges to buildSchemaEdges() in graph.ts. Edges are deduplicated against declared source/target edges. Updated 4 integration tests.
