---
id: stm-5pi1
status: closed
deps: []
links: [stm-jruy, stm-2szj, stm-eg9u, stm-pzwn, stm-to29, stm-d281]
created: 2026-03-16T15:45:22Z
type: task
priority: 1
assignee: Thorben Louw
tags: [rename-mapping-keyword]
---
# Rename top-level map keyword to mapping in STM-SPEC.md

Update all code examples, EBNF grammar, and prose in STM-SPEC.md to use mapping for the top-level block keyword. Keep map { ... } for the inline value-map literal unchanged.

## Acceptance Criteria

Every map that introduces a top-level mapping block is replaced with mapping in both code fences and EBNF. The value-map literal map { key: val } is untouched. No broken markdown.

