---
id: sl-cdvp
status: closed
deps: []
links: []
created: 2026-03-21T21:52:57Z
type: epic
priority: 0
assignee: Thorben Louw
tags: [cli, extraction, foundation]
---
# Epic: FieldDecl metadata enrichment

Extend FieldDecl type with metadata array and update extract.ts to populate it. Prerequisite for JSON output, find, fields, diff, and other commands that need field metadata.


## Notes

**2026-03-22T02:00:00Z**

Cause: FieldDecl type had no metadata array, so downstream commands couldn't access field-level metadata.
Fix: Extended FieldDecl with optional metadata array (MetaEntry[]) and populated from CST metadata_block in extractFieldTree/extractDirectFields (commit 756efa2).
