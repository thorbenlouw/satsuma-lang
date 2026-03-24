---
id: sl-6gck
status: closed
deps: []
links: []
created: 2026-03-24T08:12:48Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, fields, graph, validate]
---
# Fragment spread fields inside nested records expanded at wrong scope level

When a fragment is spread inside a nested record (e.g. `PID.Address record { ...address_fields }`), the fields from the fragment are hoisted to the top level of the containing schema instead of being placed as children of the nested record. This affects multiple CLI commands:

- **`fields --json`**: `Address` shows `children: []` and fragment fields appear as schema-level siblings of MSH, PID, PV1
- **`fields` (text)**: Fragment fields listed at top indentation level, not nested under the record
- **`graph --json`**: Node field list shows fragment fields at schema level instead of nested
- **`summary`**: Field count is wrong because hoisted fields are counted at the wrong level
- **`validate`**: Reports `field-not-in-schema` for arrows like `PID.Address.street_line_1` because the validator doesn't see the fragment fields inside the nested record

Repro: See `bug-hunt/scenario-01-healthcare-hl7.stm`, schema `hl7_adt` with `PID.Address record { ...address_fields }`

## Acceptance Criteria

1. `fields --json` shows fragment-spread fields as children of the nested record, not as schema-level fields
2. `validate` does not report `field-not-in-schema` for arrows that reference fragment-spread fields inside nested records
3. `graph --json` shows fragment fields nested correctly
4. Test with multiple levels of nesting (record inside record with spread)

## Notes

**2026-03-24T09:10:00Z**

Cause: `extractFieldTree` propagated nested record spreads (`hasSpreads`/`spreads`) up to the schema level, and `expandEntityFields` expanded them as flat schema-level fields instead of inserting them into the nested record's `children`.
Fix: Added `hasSpreads`/`spreads` to `FieldDecl`, kept nested spreads on the record field, and added `expandNestedSpreads` to recursively walk the field tree and expand spreads at the correct nesting level. Also added `expandNestedFieldPaths` for validate's path-based expansion. Updated fields, graph, and summary commands. (commit pending)

