---
id: sl-lgkm
status: closed
deps: []
links: []
created: 2026-03-28T18:36:13Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, depth, ux]
---
# bug: lineage --depth counts graph nodes not schema hops, making default depth insufficient

The --depth parameter for satsuma lineage counts individual graph nodes (both schema nodes and mapping nodes) rather than schema-to-schema hops. This makes the default depth of 10 traverse only 5 schema hops (reaching 6 schemas), not 10.

A chain of N schemas connected through N-1 mappings has 2N-1 graph nodes. Reaching all N schemas requires --depth 2*(N-1), not N-1.

Example: A 11-schema chain (10 mappings) requires --depth 20 to see all schemas.
  satsuma lineage --from s1 (default depth 10) stops at s6 — only 5 of 10 hops.
  satsuma lineage --from s1 --depth 20  →  correctly returns all 11 schemas.

This is either:
(a) A documentation bug: help text should say 'graph nodes' not imply schema hops.
(b) A behaviour bug: --depth should count schema-to-schema hops, not all nodes.

## Acceptance Criteria

Either:
(a) Help text updated to clarify that depth counts graph nodes. Document that reaching N schema hops requires --depth 2*N.
(b) --depth semantics changed to count schema-to-schema hops only, with default 10 reaching 10 schema hops.
- Smoke test test_03_lineage_combined updated to match corrected semantics


## Notes

**2026-03-28T19:31:45Z**

Cause: buildDownstream/buildUpstream in lineage.ts incremented depth on every node visit (including mappings), so schema hops required depth=2*N.
Fix: Changed to only increment depth when visiting schema or metric nodes. Removed dangling-end edge pattern that leaked out-of-depth nodes into the result. (commit pending)
