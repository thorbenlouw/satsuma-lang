---
id: sl-pce2
status: open
deps: []
links: []
created: 2026-03-26T06:17:23Z
type: task
priority: 2
assignee: Thorben Louw
tags: [tree-sitter, testing, feature-22]
---
# Dedicated at_ref corpus test file

Add a dedicated tree-sitter corpus test file (e.g. test/corpus/at_ref.txt) for the at_ref CST node type. Currently @ref is only tested indirectly through pipe_extensions.txt. A dedicated file should cover: @identifier, @schema.field, @ns::schema.field, @backtick_name.field, escaped \@ in NL strings, and @ref inside multiline strings.

## Acceptance Criteria

- Dedicated corpus test file exists at tooling/tree-sitter-satsuma/test/corpus/at_ref.txt
- Covers all @ref forms: bare identifier, dotted, namespace-qualified, backtick segments
- Covers escaped \@ (literal @ in NL)
- All corpus tests pass (tree-sitter test)

