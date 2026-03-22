---
id: sc-xuu8
status: closed
deps: [sc-291j]
links: []
created: 2026-03-22T20:17:29Z
type: task
priority: 1
assignee: Thorben Louw
parent: sc-v2pn
tags: [grammar, tests]
---
# Update tree-sitter corpus tests

Rewrite corpus tests for new unified syntax. Update schemas.txt, rename nested_arrows.txt to each_flatten.txt, update sap_po_patterns.txt, metadata.txt, namespaces.txt, recovery.txt. Add new tests for list_of scalar, list_of record, each block, flatten block, and error recovery for old syntax.

## Acceptance Criteria

tree-sitter test passes. All corpus fixtures green. Coverage for all new constructs.


## Notes

**2026-03-22T20:31:40Z**

**2026-03-22T21:18:00Z**

Cause: Corpus tests used old record_block/list_block/[] syntax.
Fix: Updated all 21 affected corpus tests and added 15 new tests as part of sc-291j grammar update. (commit b8a9a23)
