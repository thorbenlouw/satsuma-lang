---
id: sl-ysy4
status: closed
deps: [sl-ikzl, sl-60gz]
links: []
created: 2026-03-29T18:51:26Z
type: task
priority: 1
assignee: Thorben Louw
---
# feat(26): LSP — fix fieldLocations flatness bug using satsuma-core extractFieldTree

The LSP's satsuma/fieldLocations request handler currently returns only top-level fields — it does not recurse into nested record fields. This is a live bug: any LSP feature that relies on fieldLocations for nested field positions (code lens, future coverage decorations from the protocol side) silently misses nested fields.

Root cause: The fieldLocations handler was written before nested field support was added to the grammar. It was never updated to recurse. The coverage.ts fix (March 2026) worked around this by moving coverage computation into the server-side FieldInfo tree — but fieldLocations itself remains flat.

Fix: Update the fieldLocations handler to use satsuma-core's extractSchemas() + the now-public extractFieldTree() to return the full recursive FieldDecl tree, then flatten it (with dotted paths) for the response format.

Also: audit all other LSP request handlers that derive field lists from workspace-index.ts's FieldInfo. Ensure they also handle nested fields correctly, or document why they intentionally flatten.

Changes:
1. Import extractSchemas from '@satsuma/core' in the relevant handler file
2. Replace the flat namedChildren walk with a recursive extractFieldTree() call
3. Return entries for all fields at all nesting depths, using dotted paths for nested fields (e.g. 'line_items.product_id')
4. Add a test fixture with a schema containing list_of record fields; assert fieldLocations includes the nested fields

## Acceptance Criteria

1. satsuma/fieldLocations for a schema with list_of record children returns FieldLocation entries for all nested fields 2. Nested field paths use dotted notation (e.g. 'address.city') 3. All existing LSP server tests pass 4. New test in the LSP server test suite asserts nested field coverage via fieldLocations 5. Coverage decorations (via coverage.ts, which already handles nesting) remain unaffected


## Notes

**2026-03-29T20:54:26Z**

**2026-03-29T21:05:00Z** Cause: fieldLocations handler used flat .map() over def.fields, missing all nested record fields. Fix: Replaced with a recursive collect() function that walks FieldInfo.children and builds dotted paths (e.g. address.city). Added field-locations.test.js with 9 new tests covering flat, nested record, list_of record, and unknown schema. All 287 LSP tests pass.
