---
id: lsp-4hai
status: closed
deps: [lsp-d4yk]
links: []
created: 2026-03-25T17:36:36Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-5, cli]
---
# P5.4: Update lineage traversal for @ref edges

Update lineage.ts to traverse @ref edges when tracing data flow.

## Acceptance Criteria

- satsuma lineage follows @ref edges
- Lineage output includes @ref-derived paths
- Lineage tests updated


## Notes

**2026-03-26T04:21:36Z**

Cause: lineage traversal only followed declared source/target edges, not NL @ref references.
Fix: Added NL ref edge emission to buildFullGraph() in graph-builder.ts. Lineage now traverses @ref edges alongside declared source/target edges. Added 3 integration tests.
