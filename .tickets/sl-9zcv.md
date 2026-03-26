---
id: sl-9zcv
status: open
deps: []
links: []
created: 2026-03-26T08:29:53Z
type: bug
priority: 2
assignee: Thorben Louw
---
# nl-ref-extract: @ref with 3+ dot-segment paths (@schema.record.field) falsely flagged as unresolved

When an @ref uses a 3-segment dot path like @source_data.address.street (schema.record.subfield), the resolver splits at the first dot and calls hasFieldWithSpreads(schema, 'address.street'), which does flat name matching. It should use hasNestedFieldPath() to walk the nested record structure. This produces false [nl-ref-unresolved] warnings for valid nested paths.

## Acceptance Criteria

1. satsuma validate does not warn for @schema.record.subfield paths when the nested path exists
2. satsuma nl-refs correctly resolves 3+ segment @ref paths
3. lineage edges are correctly created for nested @ref paths

