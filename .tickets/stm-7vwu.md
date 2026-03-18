---
id: stm-7vwu
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
# Phase 10: stm context command

Implement src/commands/context.js. Free-text input, score blocks by relevance (name match high, field match medium, note/metadata low). Rank and emit top blocks within token budget (Math.ceil(text.length/4)). --compact, --budget, --json flags.

## Acceptance Criteria

- Scoring produces sensible rankings
- Token budget respected
- --compact applies to emitted blocks
- Test: 'add a PII field to the customer schema' surfaces correct blocks

