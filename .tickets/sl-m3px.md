---
id: sl-m3px
status: open
deps: []
links: []
created: 2026-03-24T22:14:56Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-98xk
tags: [docs, feature-21, convention]
---
# JSON path convention docs (D3)

Write docs/conventions-for-schema-formats/json/conventions.md following established format-conventions structure. Token dictionary for format json and jsonpath. Add canonical example examples/json-api-to-parquet.stm. See PRD D3.

## Acceptance Criteria

1. docs/conventions-for-schema-formats/json/conventions.md exists following established format in sibling directories
2. Token dictionary covers: format json, jsonpath with expression syntax
3. Covers patterns: simple extraction, nested traversal, array iteration on list_of record, relative paths, whole-subtree grab
4. examples/json-api-to-parquet.stm exists, demonstrates all five patterns, parses clean with satsuma validate
5. Example is directly comparable to examples/xml-to-parquet.stm (xpath equivalent)
6. Guidance on when to use jsonpath vs native record nesting
7. docs/conventions-for-schema-formats/README.md updated to include json/ entry
8. HOW-DO-I.md schema formats section links updated from placeholder to real links

