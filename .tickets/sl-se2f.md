---
id: sl-se2f
status: open
deps: []
links: []
created: 2026-03-21T07:58:15Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, metric, exploratory-testing]
---
# metric: slice metadata missing from both text and JSON output

The satsuma metric command completely omits slice metadata from output.

- What I did: ran 'satsuma metric monthly_recurring_revenue examples/'
- Expected: slice {customer_segment, product_line, region} should appear in metadata
- Actual text output shows only: source fact_subscriptions, grain monthly, filter status = 'active' AND is_trial = false — no slice
- Actual JSON output: metadata array contains source, grain, filter entries but no slice entry. No top-level 'slices' field either despite MetricRecord having slices: string[].

Root cause: extractMetaEntries() in metric.ts only handles key_value_pair and tag_token CST node types. The slice_body CST node type is a sibling of key_value_pair inside metadata_block, not a child of one. It is silently skipped.

Additionally, printJson() does not include entry.slices in the JSON output even though the index extracts them correctly.

Reproduces with all metrics that have slice metadata, including:
- monthly_recurring_revenue (examples/metrics.stm)
- churn_rate (examples/metrics.stm)
- customer_lifetime_value (examples/metrics.stm)
- order_revenue (examples/metrics.stm)
- cart_abandonment_rate (examples/metrics.stm)

Test file: /tmp/satsuma-test-metric/basic.stm (revenue metric with slice {region, product})

