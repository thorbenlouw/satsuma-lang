---
id: stm-1uh3
status: closed
deps: []
links: []
created: 2026-03-18T18:56:48Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-q2cz
tags: [parser, tree-sitter, mapping]
---
# Extend mapping body and source-entry grammar

Handle mapping note blocks before source/target and support annotated source entries used in multi-source mappings.

## Acceptance Criteria

Corpus tests cover a leading note block before source/target and source entries with per-source metadata.
The grammar parses examples/db-to-db.stm and examples/multi-source-join.stm without recovery errors from mapping-body ordering or annotated source entries.
If annotated source entries remain example-only, the task updates the spec or normalizes the examples explicitly.

