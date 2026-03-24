---
id: sl-tfbk
status: closed
deps: []
links: []
created: 2026-03-24T08:17:04Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph]
---
# graph --namespace filter drops all edges (schema_edges and field edges)

When using `--namespace` to filter the graph, ALL edges are dropped — both schema_edges and field-level edges become empty arrays, even when edges exist between schemas in the filtered namespace.

Repro:
```bash
satsuma graph bug-hunt/ --json --namespace oms
# Nodes: 2 (oms::internal_order, oms::execution_report)
# Schema edges: 0   ← WRONG: there are mappings between these schemas
# Edges: 0          ← WRONG: there are field-level arrows

satsuma graph bug-hunt/ --json --namespace risk
# Nodes: 2, Schema edges: 0, Edges: 0
```

Without the filter, the full graph has 12 schema_edges and 51 field-level edges. With `--namespace oms`, both go to zero.

Expected: At minimum, edges between nodes in the filtered namespace should be included. Ideally, edges to/from external nodes should also be included (with external nodes as boundary nodes).

## Acceptance Criteria

1. Edges between nodes within the filtered namespace are included
2. Schema edges for mappings involving namespace schemas are included
3. Edges connecting to schemas outside the namespace are included (with external nodes as boundary references)
4. Field-level edges within namespace mappings are included

