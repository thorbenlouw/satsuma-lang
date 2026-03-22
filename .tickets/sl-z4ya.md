---
id: sl-z4ya
status: closed
deps: []
links: [sl-wjb9, sl-ezpm, sl-9gvb, sl-4e5c, sl-ij5p, sl-531q]
created: 2026-03-21T21:53:11Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [cli, arrows, nested]
---
# Epic: Nested arrow handling

Nested/array arrow blocks are broken or invisible in mapping, arrows, and graph commands.


## Notes

**2026-03-22T02:00:00Z**

Cause: Nested arrow children were missing from output, had corrupted paths, and inconsistent counts.
Fix: Systematic fixes to mapping extraction, arrow indexing, and graph edge generation for nested structures (closed in commit 816fab5).
