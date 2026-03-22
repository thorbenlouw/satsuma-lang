---
id: sl-m02g
status: closed
deps: []
links: [sl-n96y, sl-6mlu, sl-z3eg, sl-5erh]
created: 2026-03-21T21:53:04Z
type: epic
priority: 0
assignee: Thorben Louw
tags: [cli, consistency]
---
# Epic: Line number indexing inconsistency

0-indexed vs 1-indexed line numbers across commands. Need to standardize on 1-indexed for all output.


## Notes

**2026-03-22T02:00:00Z**

Cause: find, nl, graph, and nl-refs used 0-indexed row from tree-sitter.
Fix: Standardized on 1-indexed line numbers across all JSON output (commit d5ca228).
