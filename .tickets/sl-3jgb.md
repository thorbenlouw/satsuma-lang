---
id: sl-3jgb
status: closed
deps: []
links: [sl-7bhh]
created: 2026-03-26T13:55:09Z
type: bug
priority: 2
assignee: Thorben Louw
---
# Where-used command: fails for dotted paths and namespace-qualified names

The Where Used command uses getWordRangeAtPosition() to extract the symbol at cursor, which only captures a single word boundary. For dotted paths like schema.field or namespace-qualified names like ns::schema, it sends only one segment to satsuma where-used, which returns not found. Should extract the full qualified name at cursor via the CST node.

## Acceptance Criteria

1. Where-used works on dotted field paths (e.g. schema.field)
2. Where-used works on namespace-qualified names (e.g. ns::schema)
3. Where-used works on @ref syntax

