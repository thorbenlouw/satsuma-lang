---
id: sl-iliz
status: closed
deps: []
links: [sl-6hot]
created: 2026-03-21T07:58:02Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, exploratory-testing]
---
# lineage: --depth --json emits edges referencing nodes not in the nodes array

When using --depth with --json, the JSON output includes edges whose target nodes are not present in the nodes array. This produces an invalid graph structure.

What I did:
  npx satsuma lineage --from source_a --depth 1 /tmp/satsuma-test-lineage/chain.stm --json

What I expected:
  All nodes referenced in edges should appear in the nodes array. Truncated nodes should either be omitted from edges or included in nodes with a 'truncated' flag.

What actually happened:
  The nodes array contains [source_a, 'a to b'] but edges include {src: 'a to b', tgt: 'intermediate_b'} where 'intermediate_b' is not in nodes.

Similarly with --depth 0:
  nodes: [source_a], edges: [{src: 'source_a', tgt: 'a to b'}] — 'a to b' not in nodes.

And --depth 2:
  nodes: [source_a, 'a to b', intermediate_b], edges include {src: 'intermediate_b', tgt: 'b to c'} — 'b to c' not in nodes.

Reproducer: /tmp/satsuma-test-lineage/chain.stm

