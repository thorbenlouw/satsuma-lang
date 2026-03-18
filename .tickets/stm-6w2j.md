---
id: stm-6w2j
status: closed
deps: []
links: []
created: 2026-03-18T20:07:49Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, bug, extraction]
---
# Annotated source entries pollute mapping.sources with metadata and NL strings

For mappings with annotated source entries (e.g. customer 360 in multi-source-join.stm), mapping.sources includes raw text with filter metadata and NL join descriptions instead of just schema names. For example, sources contain '`crm_customers` (filter "...")' and full NL join description strings instead of ['crm_customers', 'order_transactions', 'support_tickets'].

## Acceptance Criteria

- mapping.sources contains only clean schema name strings for multi-source annotated mappings
- Downstream commands (lineage, where-used, validate) work correctly for multi-source mappings
- Filter annotations and NL join descriptions are not included in source refs

