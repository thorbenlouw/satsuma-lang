---
id: sl-95jv
status: closed
deps: []
links: []
created: 2026-03-31T08:25:20Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, exploratory-testing]
---
# graph: fragment_spread edges missing from schema_edges

SATSUMA-CLI.md documents that schema_edges includes edges with role 'fragment_spread', but in practice the graph command produces 0 fragment_spread edges and 0 fragment nodes — even though the workspace has 8 fragments and multiple schemas that use ...fragment spreads.

Observed schema_edge roles: source, target, metric_source, nl_ref
Missing: fragment_spread

This means consumers using the graph for topology analysis cannot see fragment dependencies. The where-used command correctly finds fragment spreads, so the information is available in the parser — it's just not emitted by the graph builder.

## Notes

**2026-03-31**

Closed as invalid. Per ADR-008 (Fragment Spread Expansion Semantics), fragments are macros, not graph entities. They do not appear as nodes in `satsuma graph`, `satsuma lineage`, or `satsuma field-lineage`. The `fragment_spread` role documented in SATSUMA-CLI.md is incorrect — the docs should be updated to remove this role.

