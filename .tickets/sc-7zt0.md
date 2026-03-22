---
id: sc-7zt0
status: closed
deps: []
links: []
created: 2026-03-22T21:30:50Z
type: bug
priority: 2
assignee: Thorben Louw
---
# arrows --json: flatten arrow targets have doubled schema name

When querying arrows for fields inside a flatten block, the JSON target path duplicates the schema name.

Repro:
  satsuma arrows order_events.line_items.sku examples/filter-flatten-governance.stm --json

Expected: target: 'order_line_facts_parquet.sku'
Actual: target: 'order_line_facts_parquet.order_line_facts_parquet.sku'

Also affects the flatten container arrow:
  satsuma arrows order_events.line_items examples/filter-flatten-governance.stm --json
  Expected: target: 'order_line_facts_parquet'
  Actual: target: 'order_line_facts_parquet.order_line_facts_parquet'

The flatten block target schema name is prepended on top of an already schema-qualified path.

Note: Related to sl-bl5e (double-dot paths for nested arrows) but the mechanism is different — this is schema name duplication from flatten target resolution.


## Notes

**2026-03-22T22:18:21Z**

Cause: arrows --json always prefixed schema name to target, even when already schema-qualified (flatten). Fix: qualifyPath helper skips prefix if path already starts with schema name.
