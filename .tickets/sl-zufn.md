---
id: sl-zufn
status: done
deps: []
links: [sl-txbo, sl-i4go]
created: 2026-03-26T13:54:53Z
type: bug
priority: 1
assignee: Thorben Louw
---
# LSP find-references: fields not indexed — no results for arrow src/tgt paths

Find All References on a field name (e.g. cursor on email in email -> contact_email) returns no results. workspace-index.ts indexMappingRefs() only indexes schema-level source/target block refs, not field-level arrow paths (src_path/tgt_path). The CLI satsuma where-used correctly finds these — the data just isn't wired into the LSP reference provider.

## Acceptance Criteria

1. Find All References on a field in an arrow shows all arrows sourcing or targeting that field
2. Find All References on a field in a schema declaration shows all arrow usages
3. Results span multiple files in workspace

## Notes

**2026-03-26T14:30:00Z**

Cause: `indexMappingRefs()` only indexed schema-level source/target block refs but never walked arrow nodes for field-level `src_path`/`tgt_path` references.
Fix: Added `indexArrowFieldRefs()` that walks all descendants of the mapping body for `src_path`/`tgt_path` nodes and registers each field name as a reference with context `"arrow"`. Added 6 workspace-index tests and 1 references integration test.

