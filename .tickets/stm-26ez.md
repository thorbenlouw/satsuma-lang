---
id: stm-26ez
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
# Phase 7: stm lineage command

Implement src/commands/lineage.js using referenceGraph. --from walks downstream through mappings and metrics. --to finds BFS path. --depth limits recursion. Default indented tree output. --compact, --json (DAG as nodes/edges).

## Acceptance Criteria

- --from produces correct downstream tree
- --to finds correct paths via BFS
- --depth limits work
- --json DAG format correct
- Exit 1 if schema not found

