---
id: sc-nk3v
status: closed
deps: []
links: []
created: 2026-03-22T21:30:45Z
type: bug
priority: 2
assignee: Thorben Louw
---
# lineage: phantom 'note:' node and edges in lineage output

The lineage command produces a spurious 'note:' node downstream of target schemas.

Repro:
  satsuma lineage --from order_events examples/filter-flatten-governance.stm
  satsuma lineage --from order_events examples/filter-flatten-governance.stm --json

Expected: Lineage tree terminates at target schemas (completed_orders_parquet, order_line_facts_parquet).
Actual (text):
  order_events  [schema]
    completed orders  [mapping]
      completed_orders_parquet  [schema]
        note:  [?]
    order line facts  [mapping]
      order_line_facts_parquet  [schema]
        note:  [?]

Actual (JSON): includes {name: 'note:'} node and edges from target schemas to it.

The note: block inside each mapping body is being treated as a downstream reference.

