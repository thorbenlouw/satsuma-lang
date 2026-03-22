---
id: sc-3sqt
status: closed
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


## Notes

**2026-03-22T20:44:45Z**

**2026-03-22T22:10:00Z**

Cause: extract.ts detected nested structures via record_block/list_block node types which no longer exist in the grammar.
Fix: Updated extractFieldTree() to detect nested structures via schema_body child on field_decl, with list_of keyword detection via anonymous children. Added each_block/flatten_block handling to extractArrowRecords() and extractMappings(). Added children/isNamed to SyntaxNode type. Updated 4 mock tests. (commit c91a4c6)
