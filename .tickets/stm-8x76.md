---
id: stm-8x76
status: closed
deps: [stm-mpw7, stm-j9l5]
links: []
created: 2026-03-19T19:52:20Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-mt1d
tags: [stm-cli, lint, validator]
---
# Add initial non-fix stm lint rules from validator semantics

Add the first non-fix lint rules that should be surfaced through `stm lint`, reusing parser-backed validator logic where appropriate. Candidate rules include unresolved NL references, duplicate definitions, and any deterministic placeholder/policy checks chosen in the lint design.

## Design

Keep the initial set narrow and explicit. Reuse existing validation helpers where it improves consistency, but present results through lint rule ids and the lint diagnostic shape rather than raw validate formatting.

## Acceptance Criteria

1. `stm lint` surfaces at least unresolved NL refs and duplicate-definition style findings through lint rule ids.
2. Findings are emitted through the lint engine rather than ad hoc command logic.
3. Rule coverage is documented in code or docs.
4. Tests cover each added rule with realistic fixtures.

