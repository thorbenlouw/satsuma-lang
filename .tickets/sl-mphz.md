---
id: sl-mphz
status: open
deps: []
links: []
created: 2026-03-30T18:25:01Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-jvwu
tags: [core]
---
# core: extend FieldDecl with optional source location for LSP consumers

Core's FieldDecl type lacks source position data (line, column). The LSP needs this for go-to-definition, hover, and viz rendering. Currently the LSP reimplements field extraction partly to get position data.

**Design:**
Add optional position fields to FieldDecl:
- startRow?: number (0-indexed, consistent with tree-sitter)
- startColumn?: number (0-indexed)

These are populated by extractFieldTree() from the CST node's startPosition. They're optional so that tests constructing FieldDecl literals don't need to provide them.

Also audit other Extracted* types (ExtractedSchema, ExtractedMapping, etc.) for position completeness — most carry 'row' but may lack column.

**Work:**
1. Add startRow and startColumn as optional fields on FieldDecl in types.ts.
2. Populate them in extractFieldTree() from node.startPosition.
3. Audit all Extracted* types and add missing position fields.
4. Add tests verifying position data is correct.
5. Update doc-comments on FieldDecl explaining position semantics (0-indexed, from CST).

**Validation before PR:**
- All existing core tests pass (optional fields don't break anything)
- New tests verify position data
- Code meets AGENTS.md standards: FieldDecl type comments explain each field

## Acceptance Criteria

- FieldDecl has optional startRow and startColumn fields
- extractFieldTree() populates position data from CST
- All Extracted* types audited for position completeness
- Doc-comments updated
- Tests verify position data

