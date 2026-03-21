---
id: sl-09bo
status: open
deps: []
links: []
created: 2026-03-21T08:00:03Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, metric, exploratory-testing]
---
# metric: JSON output omits namespace field for namespace-qualified metrics

The satsuma metric --json output does not include the namespace field for metrics inside namespace blocks. The MetricRecord type has a namespace property, but printJson() does not serialize it.

- What I did: ran 'satsuma metric analytics::pipeline_value examples/ --json'
- Expected: JSON should include a 'namespace' field with value 'analytics'
- Actual: JSON has 'name': 'pipeline_value' with no namespace field. There is no way to distinguish namespaced from non-namespaced metrics in JSON output.

This affects all namespace-qualified metrics:
- analytics::daily_sales
- analytics::pipeline_value  
- analytics::customer_ltv
- reporting::budget_health

Test commands:
  satsuma metric 'analytics::pipeline_value' examples/ --json
  satsuma metric 'reporting::budget_health' examples/ --json

