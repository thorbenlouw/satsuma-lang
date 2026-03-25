---
id: lsp-rxne
status: open
deps: [lsp-9vgj]
links: []
created: 2026-03-25T17:28:46Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-2, cli]
---
# P2.4: Update extract.ts for multi-source extraction

Update extractArrowRecords() to extract all source fields from multi-source arrows into sources array.

## Acceptance Criteria

- Multi-source arrows produce correct sources array
- Single-source arrows produce length-1 array
- Extraction tests pass

