---
id: lsp-ulfa
status: closed
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


## Notes

**2026-03-25T19:05:42Z**

## Notes

**2026-03-25T18:45:00Z**

Cause: CLI output needed canonical field reference format for namespaced paths.
Fix: Updated pathText() to use canonicalRef() for namespaced_path CST nodes, imported canonicalRef in extract.ts. Added 2 unit tests for canonical form verification. (commit pending)
