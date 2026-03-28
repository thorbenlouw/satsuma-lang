---
id: sl-s8wi
status: closed
deps: [sl-3ccy, sl-oeem]
links: []
created: 2026-03-28T18:41:08Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, arrows, graph, consistency, spreads, namespaces]
---
# bug: graph and arrows commands disagree on field reachability for spread and cross-namespace schemas

The graph command emits field-level edges for fields that the arrows command cannot find. The two commands use different resolution strategies:

- graph: derives edges directly from arrow declarations (trusts what the mapping says)
- arrows: validates field existence against schema definition before returning results

This means graph and arrows are inconsistent:

Example 1 — spread schema (09-spread fixture):
  s1 uses ...f spread; grammar bug makes s1.fields = [] in graph node
  graph edges: correctly shows ::s1.id → ::s2.id, ::s1.code → ::s2.code, ::s1.extra → ::s2.extra
  arrows s1.id → exit 1 (Field 'id' not found in schema 's1')

Example 2 — cross-namespace source (06-namespace/cross-ns):
  graph edges: correctly shows src::s1.a → tgt::s2.b
  arrows src::s1.a → exit 1 (Field 'a' not found in schema 'src::s1')

In both cases graph is arguably more correct (the arrow really does exist), but arrows refuses to surface it. Either:
(a) arrows should use the same declaration-based resolution as graph (trusting the mapping), or
(b) graph should validate field existence and omit/warn on edges where source field cannot be verified

The schema node fields array and the edge list should be internally consistent: if a field appears in an edge, it should appear in the schema's fields array.

## Acceptance Criteria

- satsuma arrows s1.id (spread field) returns the same arrow that satsuma graph shows in edges
- satsuma arrows src::s1.a (cross-namespace source) returns the same arrow that satsuma graph shows
- OR: satsuma graph omits edges where field existence cannot be verified and emits a warning
- schema node fields array and edges array are consistent: no field appears in an edge that is absent from its schema node's fields list
- Related to sl-oeem (spread field resolution) and sl-hy8w (cross-namespace source query)


## Notes

**2026-03-28T19:31:45Z**

Cause: Three separate issues: grammar bug (sl-3ccy) made spread fields invisible, graph kept fragment nodes inconsistent with arrows validation, and multi-source attribution was wrong (sl-3rk9).
Fix: Resolved by sl-3ccy (grammar), sl-p0hz (graph schema fields), and sl-3rk9 (multi-source). (commits c5c5bf6 and pending)
