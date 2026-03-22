---
id: sl-nyny
status: open
deps: []
links: []
created: 2026-03-22T07:44:50Z
type: bug
priority: 1
assignee: Thorben Louw
parent: sl-a778
tags: [cli, diff, exploratory-testing-2]
---
# diff: does not detect metric header metadata changes

Changes to metric header attributes (source, grain, slice, filter) are silently ignored by diff. Only field changes are detected.

## Reproduction

v1.stm:
```stm
schema fact_orders { amount DECIMAL(10,2) }
schema dim_date { date DATE }

metric monthly_revenue {
  source fact_orders
  grain { month }
  slice { region }
  gross_revenue DECIMAL(14,2) (measure additive)
}
```

v2.stm:
```stm
schema fact_orders { amount DECIMAL(10,2) }
schema dim_date { date DATE }

metric monthly_revenue {
  source { fact_orders, dim_date }
  grain { month, quarter }
  slice { region, channel }
  gross_revenue DECIMAL(14,2) (measure additive)
  order_count INTEGER (measure additive)
}
```

Run: `satsuma diff v1.stm v2.stm --json`

Expected: Changes to source, grain, and slice reported under metrics > monthly_revenue.
Actual: Only field-added: order_count is reported. The source/grain/slice header changes are silent.

## Root cause

In diff.ts, diffMetric() only compares fields and ignores metric header attributes.

