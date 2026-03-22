---
id: sl-3alz
status: closed
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


## Notes

**2026-03-22T08:13:15Z**

**2026-03-22T08:25:00Z**

Cause: The tree-sitter grammar allowed path continuation dots to match across newlines, causing bare arrows in nested blocks to have their target/source text merged. sl-q613 (fields after RECORD/LIST) did not reproduce with correct Satsuma v2 syntax.
Fix: Changed path continuation dots to token.immediate(".") in grammar.js. All three child tickets resolved: sl-q613 (closed, invalid reproduction), sl-9uh0 (fixed), sl-6dt1 (fixed as downstream effect).
