---
id: sl-m2s6
status: closed
deps: []
links: []
created: 2026-04-02T09:19:19Z
type: epic
priority: 2
assignee: Thorben Louw
---
# Feature 28: pipeline simplification — all pipe steps are NL

Remove the structural/NL/mixed classification axis from the language and tooling. All pipe steps in a transform body are implicit NL strings. Arithmetic operator rules removed. Classification collapses to: none, nl, nl-derived only.

## Acceptance Criteria

1. classify.ts returns only none/nl/nl-derived
2. satsuma arrows --json never emits structural or mixed
3. satsuma nl returns ALL pipe step content including bare tokens
4. satsuma fmt handles simplified pipe steps correctly
5. All existing .stm files parse without error (backward compatible)
6. Field-lineage webview no longer offers a classification filter
7. Spec section 7.2 reframed as vocabulary conventions
8. All tests updated and passing

