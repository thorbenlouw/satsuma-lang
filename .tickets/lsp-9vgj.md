---
id: lsp-9vgj
status: closed
deps: [lsp-oj5r]
links: []
created: 2026-03-25T17:28:46Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-2, cli]
---
# P2.3: Update ArrowRecord type for multi-source

Change ArrowRecord.source to ArrowRecord.sources: string[] in types.ts. Single-source arrows have length-1 array.

## Acceptance Criteria

- ArrowRecord.sources is string[]
- TypeScript compiles with no errors
- All references updated


## Notes

**2026-03-25T19:00:00Z**

## Notes

**2026-03-25T18:30:00Z**

Cause: ArrowRecord.source was a single string; multi-source arrows need an array.
Fix: Changed ArrowRecord.source to ArrowRecord.sources: string[]. Updated all consumers in extract.ts, index-builder.ts, arrows.ts, validate.ts, fields.ts, diff.ts, graph.ts, and all test files. (commit pending)
