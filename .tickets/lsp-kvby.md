---
id: lsp-kvby
status: open
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

