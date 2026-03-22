---
id: sl-3alz
status: open
deps: []
links: []
created: 2026-03-22T07:43:44Z
type: epic
priority: 0
assignee: Thorben Louw
tags: [cli, extract, exploratory-testing-2]
---
# Nested block extraction gaps

Fields after RECORD/LIST blocks are dropped, nested arrow children with bare arrows get target-contaminated, and the last nested list arrow in graph is misattributed as derived. All stem from incomplete CST traversal of nested block structures in extract.ts.

