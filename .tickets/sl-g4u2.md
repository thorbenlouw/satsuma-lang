---
id: sl-g4u2
status: closed
deps: []
links: [sl-xh3b]
created: 2026-03-21T08:02:16Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fields, exploratory-testing]
---
# fields: cannot list fields of a metric

The `fields` command only searches for `schema` blocks, not `metric` blocks. Metrics have fields (measures) with types, so it would be useful to list their fields.

**What I did:**
```bash
npx satsuma fields test_revenue /tmp/satsuma-test-fields/metrics.stm
npx satsuma fields order_revenue examples/
```

**Expected:**
Fields of the metric listed (e.g. `total_revenue DECIMAL(12,2)`, `avg_order_value DECIMAL(12,2)` for `test_revenue`).

**Actual output:**
```
Schema 'test_revenue' not found.
Schema 'order_revenue' not found.
```
Exit code 1. The error message says "Schema" even though the user may have intended to look up a metric.

The workspace summary shows metrics have field counts (e.g. `order_revenue [5 fields]`), so the data is available.

**Reproducing fixture:** /tmp/satsuma-test-fields/metrics.stm

