---
id: stm-d281
status: closed
deps: []
links: [stm-jruy, stm-2szj, stm-eg9u, stm-5pi1, stm-pzwn, stm-to29]
created: 2026-03-16T15:45:30Z
type: task
priority: 1
assignee: Thorben Louw
tags: [rename-mapping-keyword]
---
# Rename top-level map keyword to mapping in AI-AGENT-REFERENCE.md

Update compact EBNF grammar, cheat sheet, code examples, and agent guidance in AI-AGENT-REFERENCE.md to use mapping for the top-level block keyword. Keep map { ... } for the inline value-map literal.

## Acceptance Criteria

All top-level map block references use mapping. EBNF map_block rule uses mapping keyword. Value-map literal map { key: val } is untouched.

