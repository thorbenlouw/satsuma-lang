---
id: sl-eglw
status: open
deps: []
links: []
created: 2026-03-21T08:00:37Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, meta, exploratory-testing]
---
# meta: field scope fails for metric fields

When using dotted scope to query a field inside a metric (e.g., `satsuma meta test_metric.value`), the command fails with 'Schema not found' because `extractFieldMeta` only resolves the schema name from `index.schemas`, never from `index.metrics`.

What I did:
  `satsuma meta test_metric.value /tmp/satsuma-test-meta/all-metadata.stm`

The fixture defines:
  metric test_metric (...) {
    value DECIMAL(14,2) (measure additive)
  }

Expected:
  Metadata showing measure: additive (or at minimum, the type DECIMAL(14,2))

Actual output:
  Schema 'test_metric' not found.
  Exit code: 1

Also confirmed with real examples:
  `satsuma meta monthly_recurring_revenue.value examples/metrics.stm`
  Returns: Schema 'monthly_recurring_revenue' not found.

Root cause: meta.ts line 126 — `extractFieldMeta` calls `resolveIndexKey(schemaName, index.schemas)` but never checks `index.metrics`. Metrics have fields (with metadata like `measure additive`) but `meta` cannot access them.

Fixture: /tmp/satsuma-test-meta/all-metadata.stm

