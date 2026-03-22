---
id: sl-uasu
status: open
deps: []
links: []
created: 2026-03-22T07:43:55Z
type: epic
priority: 2
assignee: Thorben Louw
tags: [cli, schema, exploratory-testing-2]
---
# Schema comment handling gaps

Comments before the first field or after the last field in a schema are dropped from output, and --json --compact does not strip comments from fieldLines (inconsistent with text --compact which does).

