---
id: sl-x11k
status: closed
deps: []
links: [sl-l83d, sl-i47e, sl-vojd, sl-rks7]
created: 2026-03-21T21:53:00Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [cli, json-output]
---
# Epic: JSON error response format

Commands outputting plain text errors when --json is used instead of structured JSON.


## Notes

**2026-03-22T02:00:00Z**

Cause: Multiple commands returned plain text errors when --json was set.
Fix: Return JSON error objects across schema, where-used, nl-refs, and validate commands (commit e2ee56a).
