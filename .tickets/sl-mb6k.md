---
id: sl-mb6k
status: closed
deps: []
links: []
created: 2026-03-24T08:13:13Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate]
---
# validate field-not-in-schema false positives for multi-source mappings

When a mapping declares multiple sources (e.g. `source { \`oms::execution_report\`, \`oms::internal_order\` }`), arrows with schema-prefixed source paths like `internal_order.account_id` are only checked against the first declared source. The validator should check field existence against ALL declared sources.

Example in `bug-hunt/scenario-02-trading-flow.stm`, mapping 'oms to risk position':
- Source: `oms::execution_report`, `oms::internal_order`
- Arrow: `internal_order.account_id -> account_id`
- Warning: 'Arrow source internal_order.account_id not declared in schema oms::execution_report'
- Expected: No warning (account_id IS declared in oms::internal_order, the second source)

## Acceptance Criteria

1. Arrow source paths are checked against ALL declared sources, not just the first
2. schema-prefixed paths (e.g. internal_order.field) match the corresponding source schema
3. Unresolved paths that don't match ANY source still produce warnings

