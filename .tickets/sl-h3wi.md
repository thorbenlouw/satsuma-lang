---
id: sl-h3wi
status: closed
deps: []
links: []
created: 2026-03-31T08:34:31Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, consistency, exploratory-testing]
---
# consistency: graph --json missing nl-derived edges for namespace-qualified workspaces

Commands: satsuma graph --json and satsuma nl-refs --json

In non-namespace workspaces (e.g., sfdc-to-snowflake), the graph correctly creates nl-derived edges when @ref in NL text resolves to a known field. Example: @StageName resolves to sfdc_opportunity.StageName, producing an nl-derived edge.

In namespace-qualified workspaces (e.g., namespaces/), the graph creates zero nl-derived edges despite nl-refs resolving 24 unique fields from 40 @refs. For example, nl-refs resolves @department -> source::finance_gl.department in the 'staging::stage gl entries' mapping, but no corresponding nl-derived edge appears in the graph.

Evidence:
  satsuma nl-refs examples/namespaces --json -> 40 refs, 24 resolved fields
  satsuma graph examples/namespaces --json -> 0 nl-derived edges, 0 nl_ref schema_edges

Comparison with non-namespace workspace:
  satsuma nl-refs examples/sfdc-to-snowflake --json -> 4 refs, 3 resolved fields
  satsuma graph examples/sfdc-to-snowflake --json -> 2 nl-derived edges (correct)

The graph builder likely fails to match namespace-qualified field references during nl-derived edge creation.


## Notes

**2026-03-31T11:59:46Z**

Cause: resolveAllNLRefs already builds fully-qualified mapping keys (ns::name) but graph.ts was prepending the namespace again, producing ns::ns::name which never matched in the index.
Fix: Removed redundant namespace prefixing in graph.ts — use nlRef.mapping directly as the mapping key. Regenerated golden graph snapshot.
