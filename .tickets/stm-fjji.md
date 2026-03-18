---
id: stm-fjji
status: open
deps: [stm-imp3, stm-a07c]
links: []
created: 2026-03-18T12:18:41Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u65b
tags: [cli]
---
# Phase 1: Workspace loader and CST index

Build src/workspace.js (find .stm files), src/parser.js (init tree-sitter, parse file, collect errors), src/extract.js (extract schemas, metrics, mappings, fragments, transforms, warnings, questions from CST), src/index-builder.js (merge into WorkspaceIndex with referenceGraph). Write unit tests for extract.js.

## Acceptance Criteria

- workspace.js finds all .stm files
- parser.js handles parse errors gracefully
- All 7 extract functions work
- WorkspaceIndex with referenceGraph built
- Unit tests pass against examples corpus

