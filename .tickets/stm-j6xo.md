---
id: stm-j6xo
status: closed
deps: []
links: []
created: 2026-03-18T18:57:04Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-q2cz
tags: [parser, tree-sitter, metrics]
---
# Finish metric grammar parity with the example corpus

Support multi-source metric metadata and decide how note blocks with adjacent strings should be handled.

## Acceptance Criteria

Corpus tests cover metric metadata with source {fact_a, dim_b} and the chosen handling for adjacent strings inside note {}.
The grammar parses examples/metrics.stm without recovery errors.
If adjacent strings are not accepted, the task updates the example/spec and explains the decision.

