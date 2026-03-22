---
id: sc-8chz
status: closed
deps: [sc-3sqt, sc-3l11]
links: []
created: 2026-03-22T20:17:49Z
type: task
priority: 1
assignee: Thorben Louw
parent: sc-v2pn
tags: [cli]
---
# Update CLI commands for unified syntax

Update schema.ts, find.ts, where-used.ts, meta.ts, nl.ts, nl-extract.ts, graph.ts, arrows.ts for new CST node types and path format (no []).

## Acceptance Criteria

Each command produces correct output for new syntax.


## Notes

**2026-03-22T20:52:20Z**

**2026-03-22T23:00:00Z**

Cause: CLI commands referenced record_block/list_block node types and [] path patterns.
Fix: Updated schema.ts, find.ts, where-used.ts, meta.ts, nl.ts, nl-extract.ts to detect nested structures via field_decl with schema_body children. (commit 9675fa2)
