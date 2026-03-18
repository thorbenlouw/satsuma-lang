---
id: stm-eqzd
status: open
deps: []
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 0: Teardown and setup

Delete existing grammar.js, corpus, queries, and src/ in tooling/tree-sitter-stm/. Update package.json for v2. Verify tree-sitter CLI and node-gyp build cleanly. Create empty test/corpus/ directory. Write docs/cst-reference.md skeleton.

## Acceptance Criteria

- Old grammar.js, corpus, queries, and src/ removed
- package.json updated for v2
- tree-sitter CLI and node-gyp build cleanly
- test/corpus/ directory exists
- docs/cst-reference.md skeleton created

