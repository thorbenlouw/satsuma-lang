---
id: stm-yoy2
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
# Phase 3: stm schema command

Implement src/commands/schema.js. Reconstruct schema from CST with nested record/list blocks and correct indentation. --compact: omit notes and NL strings. --fields-only: one line per field. --json: structured field list. Exit 1 if not found.

## Acceptance Criteria

- Schema reconstructed with correct nesting
- All flags work
- Exit 1 on unknown schema
- Tests pass against examples

