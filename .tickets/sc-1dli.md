---
id: sc-1dli
status: closed
deps: [sc-3l11]
links: []
created: 2026-03-22T20:17:49Z
type: task
priority: 2
assignee: Thorben Louw
parent: sc-v2pn
tags: [cli]
---
# Update CLI spread-expand.ts

Remove [] generation from collectFieldPaths(). Update path logic for list fields.

## Acceptance Criteria

Spread expansion works with new syntax.


## Notes

**2026-03-22T20:52:20Z**

**2026-03-22T23:00:00Z**

Cause: spread-expand.ts generated [] paths for list fields.
Fix: Removed [] path generation from collectFieldPaths(). List fields now use dot-only paths. (commit 9675fa2)
