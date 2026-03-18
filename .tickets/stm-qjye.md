---
id: stm-qjye
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
# Phase 5: stm mapping command

Implement src/commands/mapping.js. Reconstruct mapping block with source/target, arrows, transforms. --compact: omit transform bodies. --arrows-only: table of src -> tgt. --json. Exit 1 if not found.

## Acceptance Criteria

- Mapping block reconstructed with arrows
- All flags work
- Exit 1 on unknown mapping
- Tests pass

