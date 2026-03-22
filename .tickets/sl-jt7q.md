---
id: sl-jt7q
status: closed
deps: [sl-cdvp]
links: [sl-1ugo, sl-gf8d, sl-giss, sl-bfue, sl-3nrg, sl-s8xn, sl-zqqu, sl-4mh2]
created: 2026-03-21T21:53:07Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [cli, nested, extraction]
---
# Epic: Nested record/list handling

Commands fail to handle nested record/list blocks properly in extraction, display, and analysis.


## Notes

**2026-03-22T02:00:00Z**

Cause: Nested record/list children were missing from fields, meta, schema, diff, and unmapped output.
Fix: Systematic fixes across extract, fields, meta, schema, diff, and arrows commands to handle nested structures (closed in commit dce4de0).
