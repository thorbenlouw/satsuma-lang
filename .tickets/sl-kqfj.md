---
id: sl-kqfj
status: closed
deps: []
links: [sl-sq4u, sl-h8sb, cbh-so1o]
created: 2026-03-26T08:30:20Z
type: bug
priority: 1
assignee: Thorben Louw
---
# nl-refs: does not walk into each_block or flatten_block nodes

walkArrowsForNL in nl-ref-extract.ts (line 407) handles map_arrow, computed_arrow, and nested_arrow but not flatten_block or each_block. Arrows inside these block types are never scanned for @refs or backtick refs. This means: nl-refs returns empty for mappings that only have NL inside each/flatten; validate produces no warnings for @refs in these blocks; graph misses nl_ref edges; lint hidden-source-in-nl cannot detect hidden sources.

## Acceptance Criteria

1. satsuma nl-refs finds @refs in each block transforms
2. satsuma nl-refs finds @refs in flatten block transforms
3. satsuma validate warns about unresolved @refs in each/flatten
4. satsuma graph includes nl_ref edges from each/flatten NL
5. satsuma lint hidden-source-in-nl detects refs in each/flatten blocks

