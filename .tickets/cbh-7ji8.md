---
id: cbh-7ji8
status: open
deps: []
links: [cbh-ukcx, cbh-so1o, cbh-kyv3, cbh-2y8p, cbh-9cqh, cbh-b0w8, cbh-e01s]
created: 2026-03-25T11:17:11Z
type: bug
priority: 2
assignee: Thorben Louw
---
# meta: metric body note block not included in output

When running satsuma meta on a metric that has both header metadata and a body note block, only the header metadata is shown — the body note is missing.

- Exact command: satsuma meta monthly_revenue /tmp/satsuma-bug-hunt/
- Expected: Output should include the note block content ('Monthly Recurring Revenue', additivity explanation, currency conversion note)
- Actual output shows source, grain, slice, filter from header — but the note { """...""" } block inside the metric body is omitted
- JSON output also missing the note: entries array has 4 items (source, grain, slice, filter) but no note entry
- The metric has a note block at lines 13-23 of metrics.stm
- Test file: /tmp/satsuma-bug-hunt/metrics.stm (monthly_revenue metric, lines 3-24)

