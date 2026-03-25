---
id: cbh-cyl0
status: closed
deps: []
links: [cbh-y5og, cbh-h0or, cbh-n4vm]
created: 2026-03-25T11:18:53Z
type: bug
priority: 2
assignee: Thorben Louw
---
# nl-refs: metric note backtick refs reported under 'mapping' with 'note:' prefix instead of 'metric'

When a backtick reference appears in a metric's note block, nl-refs reports it under 'mapping note:monthly_revenue' instead of identifying it as a metric.

- Exact command: satsuma nl-refs /tmp/satsuma-bug-hunt/
- Expected: The backtick ref `enriched_orders` in monthly_revenue's note should be attributed to metric 'monthly_revenue', e.g. 'metric monthly_revenue' in text output and '"mapping": "monthly_revenue"' or a dedicated '"metric"' field in JSON
- Actual: Text output shows 'mapping note:monthly_revenue' and JSON shows '"mapping": "note:monthly_revenue"' — the block kind is misidentified as a mapping, and the name has a 'note:' prefix

Also in JSON output, the field is called 'mapping' but the parent is a metric, not a mapping.
- Test file: /tmp/satsuma-bug-hunt/metrics.stm (line 21)

