---
id: stm-h5jy
status: closed
deps: []
links: []
created: 2026-03-18T21:29:17Z
type: bug
priority: 2
assignee: Thorben Louw
parent: stm-r58z
tags: [validator, cli, feature-12]
---
# Bug 3: Fix metric source extraction returning keyword instead of value

extractMetrics() in src/extract.js returns the keyword 'source' as the source name instead of the actual identifier (e.g. fact_subscriptions). The block form source {a, b} is also not handled. This causes 7 false undefined-ref warnings in metrics.stm saying metrics reference undefined source 'source'. Root cause: entryText() on the value node of the source key_value_pair returns the wrong text.

## Acceptance Criteria

Metric source extraction returns actual source identifiers for both single-value (source X) and block form (source {X, Y}). stm validate on metrics.stm no longer warns about undefined source 'source'. Test coverage for metric source extraction added.

