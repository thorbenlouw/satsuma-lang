---
id: stm-8bc6
status: open
deps: [stm-fjji]
links: []
created: 2026-03-18T12:18:41Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u65b
tags: [cli]
---
# Phase 2: stm summary command

Implement src/commands/summary.js. Default output: schemas, metrics, mappings sections with counts and key metadata. --compact: names only. --json: full structured output. Test against examples/.

## Acceptance Criteria

- Default output shows schema/metric/mapping details
- --compact shows names only
- --json produces valid structured output
- No crashes on examples/

