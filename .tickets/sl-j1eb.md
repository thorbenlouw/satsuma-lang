---
id: sl-j1eb
status: closed
deps: []
links: [sl-bl5e, sl-n464]
created: 2026-03-20T18:41:06Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph, bug]
---
# graph --json duplicates schema name in from/to for multi-source mapping arrows

In graph --json output, arrows from multi-source mappings (e.g., 'customer 360' which has source crm_customers) produce edges with doubled schema prefix: 'crm_customers.crm_customers.customer_id' instead of 'crm_customers.customer_id'. Reproduced with: satsuma graph examples/ --json | grep 'crm_customers.crm_customers'. This affects the 'customer 360' mapping in multi-source-join.stm where source arrows use schema-qualified field paths like 'crm_customers.customer_id'.

## Acceptance Criteria

1. 'satsuma graph examples/ --json' has no edges with doubled schema prefix.
2. Multi-source mapping arrows produce 'schema.field' format, not 'schema.schema.field'.


## Notes

**2026-03-22T22:02:26Z**

Bug already fixed — regression tests in bug-purge.test.js all pass. Verified 2026-03-22.
