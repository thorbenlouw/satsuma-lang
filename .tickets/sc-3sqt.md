---
id: sc-3sqt
status: in_progress
deps: [sc-291j]
links: []
created: 2026-03-22T20:17:49Z
type: task
priority: 1
assignee: Thorben Louw
parent: sc-v2pn
tags: [cli]
---
# Update CLI extract.ts for unified syntax

Handle new CST node types. Replace record_block/list_block detection. Update extractFieldTree(), extractSingleArrow(), cleanPathText() for new structure. Paths no longer contain [].

## Acceptance Criteria

Unit tests for extraction pass. Correct field trees built from new syntax.

