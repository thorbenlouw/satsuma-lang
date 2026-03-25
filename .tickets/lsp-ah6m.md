---
id: lsp-ah6m
status: open
deps: [lsp-yli5, lsp-6agr]
links: []
created: 2026-03-25T17:36:36Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-5, cli]
---
# P5.1: Change hidden-source-in-nl to error

Change hidden-source-in-nl lint rule from warning to error in lint-engine.ts.

## Acceptance Criteria

- hidden-source-in-nl produces error severity
- satsuma lint exits non-zero when undeclared @ref found
- Lint tests updated

