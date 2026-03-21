---
id: sl-lmcp
status: open
deps: []
links: []
created: 2026-03-21T07:58:47Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, exploratory-testing]
---
# lineage: --to --depth drops paths entirely instead of truncating them

When using --to with --depth, paths whose total length exceeds the depth are silently dropped rather than being truncated (like --from --depth does with [?] markers). This makes --to --depth unusable for exploring upstream lineage incrementally.

What I did:
  npx satsuma lineage --to target_d --depth 5 /tmp/satsuma-test-lineage/chain.stm

What I expected:
  Truncated upstream paths showing as much of the lineage as depth allows, similar to how --from --depth shows partial paths with [?] markers.

What actually happened:
  Output shows only the target with no upstream chain:
  target_d

  The chain is 6 edges long (source_a -> a_to_b -> intermediate_b -> b_to_c -> intermediate_c -> c_to_d -> target_d), and --depth 5 drops the entire path. --depth 6 shows the full chain. --depth <6 shows nothing upstream.

Comparison with --from behavior:
  npx satsuma lineage --from source_a --depth 2 /tmp/satsuma-test-lineage/chain.stm
  Correctly shows partial paths with [?] truncation markers.

Reproducer: /tmp/satsuma-test-lineage/chain.stm

