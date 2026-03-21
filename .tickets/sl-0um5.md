---
id: sl-0um5
status: closed
deps: []
links: [sl-4m85]
created: 2026-03-21T07:58:59Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, metric, exploratory-testing]
---
# metric: text output does not quote multi-word metric names

When a metric has a quoted multi-word name (e.g. 'multi word metric'), the text output renders it without quotes, making it ambiguous.

- What I did: ran 'satsuma metric "multi word metric" /tmp/satsuma-test-metric/'
- Source file has: metric 'multi word metric' (source data, slice {a, b}) { ... }
- Expected: metric 'multi word metric' (source data) { ... }
- Actual: metric multi word metric (source data) { ... }

Without quotes, 'multi word metric' appears as three bare tokens which is not valid Satsuma syntax. The output cannot be round-tripped back through the parser.

Test file: /tmp/satsuma-test-metric/quoted_names.stm

