---
id: sl-ee6o
status: closed
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


## Notes

**2026-04-02T00:00:00Z**

Cause: In `buildDownstream`/`buildUpstream`, mapping/transform nodes don't increment depth, so a schema at `depth == maxDepth` still admitted its outgoing mapping children (they passed `nextDepth <= maxDepth`), but those mappings' target schemas were out of bounds — leaving the mapping dangling with no outgoing edge.
Fix: Changed the depth check for non-schema/metric children to `depth < maxDepth` instead of `nextDepth <= maxDepth`, ensuring mappings are only included when there is room for at least one more schema hop beyond them (`lineage.ts`).
