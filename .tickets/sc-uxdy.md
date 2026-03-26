---
id: sc-uxdy
status: closed
deps: []
links: []
created: 2026-03-26T06:21:26Z
type: task
priority: 2
assignee: Thorben Louw
tags: [docs, tutorials, feature-22]
---
# Validate tutorial satsuma examples (DE tutorial)

Extract all ```stm code blocks from docs/tutorials/data-engineer-tutorial.md, validate each with the CLI, and update to use current v2 syntax including @ref, backtick-only labels, and multi-source arrows where appropriate. Every extracted block must parse error-free.

## Acceptance Criteria

- All ```stm blocks in data-engineer-tutorial.md extracted and validated with satsuma validate
- Blocks updated to use @ref syntax for field/schema cross-references in NL strings
- Blocks use backtick-only labels (no single quotes)
- Zero parse errors across all blocks
- Tutorial narrative updated if syntax examples changed

