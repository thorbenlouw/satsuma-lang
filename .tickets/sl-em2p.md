---
id: sl-em2p
status: open
deps: []
links: []
created: 2026-03-31T08:26:11Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, graph, exploratory-testing]
---
# lineage vs graph: inconsistent edge property names (src/tgt vs from/to)

The `lineage --json` and `graph --json` commands use different property names for edge endpoints:
- `lineage --json`: edges use `src` and `tgt`
- `graph --json`: both `schema_edges` and `edges` use `from` and `to`

This inconsistency means agents cannot use a single edge-parsing function for both commands and must map between naming conventions when comparing results.

**Commands to reproduce:**
```bash
npx satsuma lineage --from a --json /tmp/satsuma-test-lineage-graph/diamond.stm | jq '.edges[0] | keys'
# ["src", "tgt"]

npx satsuma graph /tmp/satsuma-test-lineage-graph/diamond.stm --json | jq '.schema_edges[0] | keys'
# ["from", "role", "to"]
```

**Expected:** Both commands should use the same property names for edge endpoints (either both use `src/tgt` or both use `from/to`).

**Fixture:** /tmp/satsuma-test-lineage-graph/diamond.stm

