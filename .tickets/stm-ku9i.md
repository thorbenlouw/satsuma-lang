---
id: stm-ku9i
status: closed
deps: []
links: [stm-3af2]
created: 2026-03-19T12:03:46Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, namespaces, lineage]
---
# lineage --from shows unqualified target schemas, breaking multi-hop traversal

When tracing lineage forward with `stm lineage --from`, target schemas in the output are shown without their namespace prefix. For example, `stm lineage --from 'raw::crm_deals' examples/ns-platform.stm` outputs:

```
raw::crm_deals  [schema]
  vault::load hub_deal  [mapping]
    hub_deal  [schema]          <-- should be vault::hub_deal
```

The JSON output confirms this: `"name": "hub_deal"` instead of `"vault::hub_deal"`.

This breaks multi-hop traversal because the unqualified `hub_deal` in the graph doesn't match the `vault::hub_deal` reference used by downstream mappings (e.g., `mart::build fact_deals` has source `vault::hub_deal`). As a result, lineage stops at the first hop instead of continuing through the full chain.

When you trace from `vault::hub_deal` directly, the second hop works fine — it finds `mart::build fact_deals`. The bug is that the first hop emits an unqualified name that severs the graph connection.

## Acceptance Criteria

1. `stm lineage --from 'raw::crm_deals' examples/ns-platform.stm` shows fully qualified target schema names: `vault::hub_deal`, `vault::link_contact_deal`.
2. JSON output nodes include namespace prefix: `"name": "vault::hub_deal"`.
3. Multi-hop lineage works end-to-end: tracing from `raw::crm_deals` reaches `mart::fact_deals` (via vault::hub_deal) in a single invocation.
4. Global (non-namespaced) schemas remain unqualified in output.
5. Existing non-namespace lineage behavior is unchanged.

