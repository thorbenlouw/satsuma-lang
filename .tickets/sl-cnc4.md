---
id: sl-cnc4
status: open
deps: []
links: []
created: 2026-03-28T18:41:16Z
type: bug
priority: 3
assignee: Thorben Louw
tags: [cli, arrows, graph, consistency, nl]
---
# bug: graph from:null vs arrows from:"" — inconsistent representation of no-source arrows

For derived arrows with no source field (e.g. -> z { NL }), the two commands represent the absent source differently:

  satsuma graph  → edges[0].from = null  (JSON null)
  satsuma arrows → source: ""           (empty string)

One of these should be the canonical representation. null is more semantically precise (no source vs an empty string which could mean anything). The arrows command should be updated to return null (or omit the key) when there is no source field, to match the graph output.

## Acceptance Criteria

- Consistent representation of no-source arrows across graph and arrows commands
- Preferred: both use null (or omit the key entirely) when no source field exists
- If empty string is preferred: graph updated to return "" instead of null
- Documentation updated in SATSUMA-CLI.md

