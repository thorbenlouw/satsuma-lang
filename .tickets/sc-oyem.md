---
id: sc-oyem
status: open
deps: []
links: []
created: 2026-03-26T06:21:24Z
type: task
priority: 2
assignee: Thorben Louw
tags: [docs, tutorials, feature-22]
---
# Validate tutorial satsuma examples (BA tutorial)

Extract all ```stm code blocks from docs/tutorials/ba-tutorial.md, validate each with the CLI, and update to use current v2 syntax including @ref, backtick-only labels, and multi-source arrows where appropriate. Every extracted block must parse error-free.

## Acceptance Criteria

- All ```stm blocks in ba-tutorial.md extracted and validated with satsuma validate
- Blocks updated to use @ref syntax for field/schema cross-references in NL strings
- Blocks use backtick-only labels (no single quotes)
- Zero parse errors across all blocks
- Tutorial narrative updated if syntax examples changed

