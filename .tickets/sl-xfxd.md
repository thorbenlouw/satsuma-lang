---
id: sl-xfxd
status: closed
deps: []
links: []
created: 2026-03-31T08:26:07Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lineage, graph, exploratory-testing]
---
# lineage --json: not-found error returns plain text instead of JSON

When `lineage --from <nonexistent> --json` is used and the schema is not found, the error is returned as plain text (`Node 'nonexistent' not found.`) instead of a JSON error object. This is inconsistent with other commands like `schema --json` which return `{"error": "Schema 'x' not found.", "available": [...]}` for not-found cases.

**Commands to reproduce:**
```bash
npx satsuma lineage --from nonexistent --json /tmp/satsuma-test-lineage-graph/diamond.stm
# Returns: Node 'nonexistent' not found.
# Expected: {"error": "Node 'nonexistent' not found."}

npx satsuma schema nonexistent --json /tmp/satsuma-test-lineage-graph/diamond.stm
# Returns: {"error": "Schema 'nonexistent' not found.", "available": [...]}  <-- correct JSON
```

Agents parsing `--json` output will fail to parse the plain text error.

