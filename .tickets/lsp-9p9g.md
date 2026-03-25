---
id: lsp-9p9g
status: open
deps: [lsp-ah6m]
links: []
created: 2026-03-25T17:36:36Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-5, cli]
---
# P5.2: Add lint --fix auto-fix for undeclared @refs

Add auto-fix that inserts undeclared @ref mentions into multi-source arrows or source blocks when running satsuma lint --fix.

## Acceptance Criteria

- Undeclared @ref in arrow NL added to arrow source list
- Undeclared @ref in non-arrow NL added to mapping source block
- Auto-fix produces valid parseable output
- Round-trip: lint --fix then lint produces no errors
- Tests cover both arrow and source-block insertion

