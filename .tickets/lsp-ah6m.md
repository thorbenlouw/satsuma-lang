---
id: lsp-ah6m
status: closed
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


## Notes

**2026-03-26T04:04:37Z**

Cause: hidden-source-in-nl severity was set to warning instead of error.
Fix: Changed severity from 'warning' to 'error' in lint-engine.ts line 88. Added severity assertion to lint-engine.test.js.
