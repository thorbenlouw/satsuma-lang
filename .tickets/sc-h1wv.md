---
id: sc-h1wv
status: closed
deps: []
links: []
created: 2026-03-22T21:30:30Z
type: bug
priority: 2
assignee: Thorben Louw
---
# find --json: schema-level entries omit metadata array and tag value

When find --tag matches a schema-level metadata entry, the JSON output has no metadata array and no way to determine the tag's value.

Repro:
  satsuma find --tag classification examples/filter-flatten-governance.stm --json

Expected: Schema-level entries (field: '(schema)') include metadata array and the matched tag's value (e.g. classification 'INTERNAL' vs 'RESTRICTED').
Actual: Schema-level entries have no metadata key:
  {blockType: 'schema', block: 'order_events', field: '(schema)', tag: 'classification', file: '...', line: 32}

Field-level entries correctly include metadata arrays. This means a consumer auditing classification policy cannot determine the classification value for schema-level tags from JSON output.

