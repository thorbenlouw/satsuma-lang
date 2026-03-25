---
id: lsp-oj5r
status: open
deps: []
links: []
created: 2026-03-25T17:28:46Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-2, grammar]
---
# P2.1: Extend map_arrow grammar for multi-source

Extend map_arrow rule in grammar.js to accept commaSep1(src_path) instead of single src_path. Regenerate parser.

## Acceptance Criteria

- map_arrow accepts comma-separated source paths
- Single-source arrows still parse correctly (no regression)
- tree-sitter generate succeeds
- Existing corpus tests pass

