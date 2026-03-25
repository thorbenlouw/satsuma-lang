---
id: sl-xj4p
status: closed
deps: []
links: [cbh-ekvb, cbh-n4vm]
created: 2026-03-24T08:15:14Z
type: feature
priority: 3
assignee: Thorben Louw
tags: [cli, arrows]
---
# arrows command only supports 2-level paths (schema.field), not deeper nesting

The `arrows` command accepts only `schema.field` (2-level) paths. For schemas with nested records, there is no way to query arrows for a specific deeply nested field when multiple fields share the same leaf name.

Example: `pacs008` has BIC fields at 4 different nested locations:
- GrpHdr.InstgAgt.BIC
- GrpHdr.InstdAgt.BIC
- CdtTrfTxInf.DbtrAgt.BIC
- CdtTrfTxInf.CdtrAgt.BIC

`satsuma arrows pacs008.BIC` returns ALL 7 arrows involving any BIC field, with no way to filter to just DbtrAgt.BIC. Attempting `satsuma arrows pacs008.DbtrAgt.BIC` fails with 'Field not found'.

This is problematic for PII audit and impact analysis workflows where you need to trace a specific field, not all fields with the same name.

## Acceptance Criteria

1. Deeply nested field paths like `pacs008.CdtTrfTxInf.DbtrAgt.BIC` resolve correctly
2. Ambiguous leaf-name queries (e.g. `pacs008.BIC`) still work as before (show all matches)
3. JSON output includes the full nested path for each arrow's source/target field


