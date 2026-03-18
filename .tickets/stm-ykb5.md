---
id: stm-ykb5
status: closed
deps: [stm-fjji]
links: []
created: 2026-03-18T12:18:41Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u65b
tags: [cli]
---
# Phase 9: stm warnings command

Implement src/commands/warnings.js. Pull from WorkspaceIndex.warnings. Format: file:block.field //! text. --questions shows questions instead. --json flag.

## Acceptance Criteria

- Warnings displayed with correct format
- --questions shows question comments
- --json produces valid output

