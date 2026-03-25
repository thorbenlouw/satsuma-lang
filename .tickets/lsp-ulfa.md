---
id: lsp-ulfa
status: open
deps: [lsp-upfx]
links: []
created: 2026-03-25T17:28:23Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-1, cli]
---
# P1.2: Update extract.ts to use canonicalRef()

Update pathText() and extractArrowRecords() in extract.ts to produce canonical field references via canonicalRef().

## Acceptance Criteria

- pathText() returns canonical form
- extractArrowRecords() emits canonical source/target refs
- Existing tests updated to expect canonical format

