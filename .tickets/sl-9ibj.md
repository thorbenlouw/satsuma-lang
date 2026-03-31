---
id: sl-9ibj
status: closed
deps: []
links: []
created: 2026-03-31T08:29:20Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: graph --namespace filter leaks cross-namespace edges and creates dangling node references

The `graph --namespace <ns>` filter correctly excludes nodes from other namespaces but fails to exclude edges and schema_edges that reference those excluded nodes. This causes:
1. `stats.arrows` counts arrows from excluded mappings (e.g., `--namespace crm` shows `arrows: 4` from a warehouse mapping)
2. `edges` array contains field-level edges with from/to pointing to fields in schemas not present in the `nodes` array
3. `schema_edges` array references node IDs not in the `nodes` array (dangling references)
4. `unresolved_nl` includes entries from excluded mappings

Repro on canonical examples:
  cd examples/namespaces
  satsuma graph . --namespace pos --json
  # Shows 0 mappings but 4 arrows; edges reference warehouse::hub_store.* fields; schema_edges reference pos::stores -> warehouse::load hub_store

Any consumer traversing the graph will encounter dangling references.

