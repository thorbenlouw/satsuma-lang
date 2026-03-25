---
id: lsp-vupl
status: closed
deps: [lsp-rxne]
links: []
created: 2026-03-25T17:28:46Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-2, cli]
---
# P2.5: Update CLI commands for multi-source arrows

Update arrows, mapping, graph, lineage, and validate commands to handle ArrowRecord.sources as array.

## Acceptance Criteria

- arrows command shows all sources
- mapping command displays multi-source arrows correctly
- graph emits one edge per source field
- lineage traverses all source edges
- validate checks all source refs
- All command tests pass


## Notes

**2026-03-25T22:32:13Z**

## Notes

**2026-03-25T19:30:00Z**

Cause: CLI commands needed multi-source arrow support.
Fix: All command updates were completed in P2.3 (lsp-9vgj) when ArrowRecord.sources was introduced. arrows, graph, validate, fields, diff commands all updated. 809 tests pass.
