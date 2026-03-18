---
id: stm-120o
status: open
deps: [stm-6lq1, stm-jbba, stm-y9a1, stm-i0br]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 10: Queries (highlights, folds, locals)

Write queries/highlights.scm covering keywords, operators, block labels, field names/types, metadata tokens, strings, all comment types, map keys/values. Write queries/folds.scm for block bodies. Write queries/locals.scm for block label definitions and backtick references.

## Acceptance Criteria

- highlights.scm covers all token types
- Distinct highlight groups for //! and //?
- folds.scm folds on block bodies
- locals.scm covers labels and backtick refs

