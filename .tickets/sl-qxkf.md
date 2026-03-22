---
id: sl-qxkf
status: closed
deps: []
links: []
created: 2026-03-22T07:43:49Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [cli, line-numbers, exploratory-testing-2]
---
# Line number indexing residual bugs

Schema --json row values are still 0-indexed (sl-m02g incomplete), and nl-refs line numbers are off by 1 for single-line strings and off by 2 for triple-quoted strings.

