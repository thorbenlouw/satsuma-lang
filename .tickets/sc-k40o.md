---
id: sc-k40o
status: open
deps: []
links: []
created: 2026-03-26T06:21:31Z
type: task
priority: 2
assignee: Thorben Louw
tags: [docs, conventions, feature-22]
---
# Validate docs/ convention guides satsuma examples

Extract all ```stm code blocks from docs/ convention guides (json, edi, cobol-copybook, governance, merge-strategy, reports-and-models, data-modelling, and all format-specific conventions), validate each with the CLI, and update to use current v2 syntax. Covers ~30 code blocks across ~17 files.

## Acceptance Criteria

- All ```stm blocks in docs/ convention guides extracted and validated with satsuma validate
- Blocks updated to use @ref syntax where appropriate
- Blocks use backtick-only labels (no single quotes)
- Zero parse errors across all blocks
- Convention guide narrative updated if syntax examples changed

