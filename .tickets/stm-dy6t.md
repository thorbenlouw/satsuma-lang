---
id: stm-dy6t
status: open
deps: [stm-55vc]
links: []
created: 2026-03-16T13:46:39Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-t1n8
---
# Cover STM map syntax, paths, and edge-case highlighting

Expand the STM TextMate grammar and fixtures to handle map-heavy syntax, path forms, transform continuations, nested maps, comment variants, and malformed editing states without catastrophic over-scoping.

## Acceptance Criteria

Highlighting covers map headers, direct mappings, computed mappings, nested maps, transform heads, pipeline continuations, and when/else/fallback continuations.
Path syntax including dotted paths, relative paths, and array segments is highlighted consistently.
Canonical examples and focused fixtures cover tags, annotations, notes, map syntax, and comment prefixes //, //!, and //?.
Malformed fixtures verify acceptable degradation for incomplete operators, broken annotations, unterminated notes, and missing braces.
Any syntax areas that remain approximate are documented near the fixtures or grammar.

