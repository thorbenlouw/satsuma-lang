---
id: stm-migi
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
# Phase 6: stm find command

Implement src/commands/find.js. --tag <token> searches all fields for matching tag_token or key_value_pair key. Multi-word match support. --in scope filter. --compact, --json flags.

## Acceptance Criteria

- Tag search works for simple and multi-word tokens
- --in restricts scope correctly
- Output grouped by schema/metric
- Tests: stm find --tag pii, --tag pk, --tag measure

