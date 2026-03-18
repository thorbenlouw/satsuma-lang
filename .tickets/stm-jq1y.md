---
id: stm-jq1y
status: closed
deps: [stm-fjji, stm-26ez]
links: []
created: 2026-03-18T12:18:41Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u65b
tags: [cli]
---
# Phase 8: stm where-used command

Implement src/commands/where-used.js. Accepts schema, fragment, or transform name. Uses referenceGraph for schemas, CST fragment_spread nodes for fragments/transforms. Output grouped by usage type. --json flag.

## Acceptance Criteria

- Schema references found via referenceGraph
- Fragment/transform references found via CST
- Output grouped by usage type
- --json produces structured list

