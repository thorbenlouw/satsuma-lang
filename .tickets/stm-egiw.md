---
id: stm-egiw
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
# Phase 4: stm metric command

Implement src/commands/metric.js. Reconstruct metric block with metadata, measure fields, notes. Format multi-line metadata when >2 entries. --compact, --sources, --json flags. Exit 1 if not found.

## Acceptance Criteria

- Metric block reconstructed correctly
- Multi-line metadata formatting works
- All flags work
- Exit 1 on unknown metric

