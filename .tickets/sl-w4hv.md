---
id: sl-w4hv
status: closed
deps: []
links: [sl-6hot]
created: 2026-03-21T08:03:08Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph, exploratory-testing]
---
# graph: --schema-only edges array is empty for mappings with only derived arrows

When a mapping has only derived arrows (-> tgt with no source field), --schema-only mode produces an empty edges array for that mapping, even though the schema_edges section correctly shows the source/target relationships.

What I did:
  Created /tmp/satsuma-test-graph/derived-only.stm with a mapping that has only derived arrows:
    mapping 'enrich data' {
      source { `raw_data` }
      target { `enriched_data` }
      -> amount_usd   { ... }
      -> processed_at { now_utc() }
      -> source_hash  { ... }
    }
  
  Ran: satsuma graph /tmp/satsuma-test-graph/derived-only.stm --json --schema-only

What I expected:
  The edges array should contain a schema-level edge like:
    {"from": "raw_data", "to": "enriched_data", "mapping": "enrich data", ...}
  since the mapping declares raw_data as source and enriched_data as target.

What actually happened:
  edges: []
  schema_edges correctly shows:
    {"from": "raw_data", "to": "enrich data", "role": "source"}
    {"from": "enrich data", "to": "enriched_data", "role": "target"}

Also confirmed with examples/ns-platform.stm — the mapping mart::build fact_deals (which has 4 declared sources but all derived arrows) is missing from schema-only edges. 25 edges are present in schema-only mode across the examples/ workspace, but there should be 26 (one per mapping).

Reproducer: /tmp/satsuma-test-graph/derived-only.stm


## Notes

**2026-03-22T01:11:45Z**

Added fallback for derived-only mappings in --schema-only mode: when a mapping has no field edges, generate schema-level edges from declared source/target lists. Added integration test. All 593 tests pass.
