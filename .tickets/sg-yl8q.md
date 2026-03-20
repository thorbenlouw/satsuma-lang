---
id: sg-yl8q
status: closed
deps: []
links: [stm-7rz4]
created: 2026-03-20T13:13:53Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [validator, examples]
---
# Fix examples/ validation regression: duplicate currency_rates and undefined metric sources

After adding the duplicate-definition rule to validate, examples/ now shows 1 error (currency_rates defined in both common.stm and lookups/finance.stm) and 13 undefined-ref warnings (metrics.stm references schemas like fact_subscriptions, dim_customer, fact_orders that are not defined in the examples directory). Feature 12 closed with 0 errors/0 warnings; these are regressions from new rules.

## Acceptance Criteria

satsuma validate examples/ produces 0 errors and 0 false-positive warnings. Either fix the duplicate schema or suppress it, and either add missing metric source schemas or adjust the validator to handle standalone metric examples.

