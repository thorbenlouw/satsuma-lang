---
id: sl-p0hz
status: closed
deps: [sl-3ccy]
links: []
created: 2026-03-28T18:41:36Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, graph, spreads, fragments, design]
---
# bug: fragments appear as graph nodes and are not pre-expanded into schema field lists

Fragment spreads (...f) are a macro mechanism — they should be transparently expanded into the schema's field list before any analysis. Instead, fragments currently appear as first-class nodes in the graph output, and schema field lists do not include the fields contributed by spreads.

Observed (satsuma graph on 06-namespace/cross-ns.stm):
  nodes: [..., {id:'gf', kind:'fragment', fields:[{name:'id'}]}, ...]
  src::s1.fields = []   ← should include {name:'id'} from ...gf spread

Observed (satsuma graph on 09-spread/fixture.stm):
  nodes: [..., {id:'f', kind:'fragment', fields:[{name:'id'},{name:'code'}]}, ...]
  s1.fields = []         ← should include {name:'id'},{name:'code'} from ...f, plus {name:'extra'} inline

Expected behaviour:
  - Fragment nodes should NOT appear in graph output (they are not schemas, mappings, metrics, or transforms)
  - Schema field lists should include all fields from spreads, recursively expanded, as if they were declared inline
  - stats.fragments can remain for informational purposes but fragment nodes should be absent from nodes[]
  - The fields array on a schema node should be the complete, expanded field set

This is the correct mental model: a fragment is a named macro. ...f means 'paste these field declarations here'. The graph consumer should not need to know whether a field came from a spread or was declared inline — they are equivalent.

## Acceptance Criteria

- Fragment nodes do not appear in graph nodes[] array
  - Schema nodes' fields arrays include all spread-contributed fields, recursively expanded
  - For schema s1 { ...f  a x } where fragment f { id x  code x }: s1.fields = [{name:id},{name:code},{name:a}]
  - satsuma arrows s1.id works (field is known to be a member of s1)
  - stats.fragments count may remain; no fragment nodes in nodes[]
  - Spread resolution is recursive: ...f where f { ...g  a x } expands g first then a
  - Smoke tests updated: test_09_spread_field_not_found becomes test_09_spread_field_found


## Notes

**2026-03-28T19:31:45Z**

Cause: graph.ts explicitly added fragment nodes to nodes[] array and schema spread fields were not included in schema node field lists.
Fix: Removed fragment node loop from graph.ts; fragments are now transparent macros expanded into consuming schema field lists. Fragment-spread schema_edges removed as fragments are no longer graph nodes. stats.fragments count preserved. (commit pending)
