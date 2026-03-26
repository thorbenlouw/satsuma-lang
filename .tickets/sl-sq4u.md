---
id: sl-sq4u
status: closed
deps: []
links: [sl-h8sb, cbh-so1o, sl-kqfj]
created: 2026-03-26T08:30:27Z
type: bug
priority: 2
assignee: Thorben Louw
---
# nl: field-scoped query does not find NL inside each/flatten blocks

extractFromField in nl.ts (lines 203-231) scans mapping_body children for map_arrow/computed_arrow but does not recurse into flatten_block or each_block children. Result: 'satsuma nl target_schema.field_name' returns empty for fields mapped inside each/flatten blocks, even though mapping-scoped 'satsuma nl mapping_name' correctly finds the same NL.

## Acceptance Criteria

1. satsuma nl target.field finds NL from arrows inside flatten blocks
2. satsuma nl target.field finds NL from arrows inside each blocks
3. Both text and JSON output modes work

