---
id: sl-xifk
status: open
deps: []
links: []
created: 2026-03-21T07:58:32Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, metric, exploratory-testing]
---
# metric: JSON output omits notes entirely

The satsuma metric --json output has no field for notes. Note blocks inside metrics are completely absent from JSON.

- What I did: ran 'satsuma metric monthly_recurring_revenue examples/ --json'
- Expected: JSON should include a 'notes' array or 'note' field containing the note block content ("Sum of active subscription amounts, normalized to monthly...")
- Actual: JSON has name, displayName, sources, grain, fields, metadata, file, row — no notes field at all.

The text output shows 'note { ... }' (collapsed) but the JSON gives no way to access note content programmatically. This makes the --json flag insufficient for agents that need to read metric documentation.

Every metric with a note block is affected:
- monthly_recurring_revenue, churn_rate, customer_lifetime_value, conversion_rate, pipeline_value, order_revenue, cart_abandonment_rate

Test file: /tmp/satsuma-test-metric/basic.stm (revenue metric has a note block)

