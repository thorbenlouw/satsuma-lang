---
id: lsp-kvby
status: closed
deps: [lsp-vm73]
links: []
created: 2026-03-25T17:29:21Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-3, cli]
---
# P3.7: Update extract.ts pipe step classification

Update pipe step extraction and classification for simplified pipe_text nodes.

## Acceptance Criteria

- fragment_spread and map_literal classified as structural
- pipe_text classified as NL
- Classification tests pass


## Notes

**2026-03-26T01:14:25Z**

**2026-03-26T16:20:00Z**

Cause: CLI code referenced removed CST node types.
Fix: Already completed in P3.1/P3.2 commits. meta-extract.ts uses tag_with_value, classify.ts uses pipe_text with NL child detection, extract.ts updated for all new node types. All 817 CLI tests pass.
