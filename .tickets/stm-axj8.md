---
id: stm-axj8
status: closed
deps: []
links: []
created: 2026-03-19T12:04:10Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespaces, metric]
---
# metric metadata values lost for namespace-qualified sources

When a metric uses a namespace-qualified source reference (e.g., `source vault::hub_deal`), the metadata extraction duplicates the key as the value instead of capturing the actual value.

Reproduce:
```bash
stm metric pipeline_value examples/ns-platform.stm
# Output: metric pipeline_value "Active Pipeline Value" (source source, grain grain) {
#   ^^^ should be (source vault::hub_deal, grain daily)

stm metric pipeline_value examples/ns-platform.stm --json
# metadata array shows:
#   {"key": "source", "value": "source"},
#   {"key": "grain", "value": "grain"}
# Should be:
#   {"key": "source", "value": "vault::hub_deal"},
#   {"key": "grain", "value": "daily"}
```

Note: the top-level JSON fields `sources` and `grain` are correct (`["vault::hub_deal"]` and `"daily"`). Only the `metadata` array is wrong. The human-readable output uses the metadata array, which is why it renders incorrectly.

The same bug affects all metrics with namespace-qualified sources, including `daily_sales` in `examples/namespaces.stm`. Non-namespaced metrics (e.g., `order_revenue` in `examples/metrics.stm`) render correctly.

## Acceptance Criteria

1. `stm metric pipeline_value examples/ns-platform.stm` displays `(source vault::hub_deal, grain daily)`.
2. JSON metadata array shows `{"key": "source", "value": "vault::hub_deal"}` and `{"key": "grain", "value": "daily"}`.
3. `stm metric daily_sales examples/namespaces.stm` displays `(source ecom::orders, grain daily)`.
4. Non-namespaced metrics continue to render correctly.
5. Metrics with multiple namespace-qualified sources render all values correctly.

