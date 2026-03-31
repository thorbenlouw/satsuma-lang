---
id: sl-ee6o
status: open
deps: []
links: []
created: 2026-03-31T08:25:57Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, graph, exploratory-testing]
---
# lineage: --depth N includes dangling mapping node beyond depth limit

When using `lineage --from/--to --depth N`, the result includes one extra mapping node beyond the depth limit. This mapping appears as a dangling node with an incoming edge from the last schema within the depth limit, but no outgoing edge to its target (for --from) or no incoming edge from its source (for --to).

**Commands to reproduce:**
```bash
npx satsuma lineage --from chain_a --depth 1 --json /tmp/satsuma-test-lineage-graph/chain.stm
```

**Expected:** 3 nodes (chain_a, a_to_b, chain_b), 2 edges (chain_a -> a_to_b, a_to_b -> chain_b)
**Actual:** 4 nodes (chain_a, a_to_b, chain_b, b_to_c), 3 edges (chain_a -> a_to_b, a_to_b -> chain_b, chain_b -> b_to_c). The node `b_to_c` is dangling -- it has no outgoing edge.

This pattern repeats at every depth level and for both --from and --to.

**Fixture:** /tmp/satsuma-test-lineage-graph/chain.stm (6-hop chain A->B->C->D->E->F)

