---
id: sl-qofc
status: closed
deps: []
links: []
created: 2026-03-31T08:29:27Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: mapping text output drops namespace prefix from mapping name

The `mapping` command's text output omits the namespace prefix from the mapping name header, showing e.g. `mapping 'load hub_store'` instead of `mapping 'warehouse::load hub_store'`. The JSON output correctly includes the qualified name. Other commands are inconsistent: `context` shows the full qualified name, `schema` shows the full qualified name, but `mapping` and `nl` drop it.

Repro:
  cd examples/namespaces
  satsuma mapping 'warehouse::load hub_store'
  # Output: mapping 'load hub_store' { ... }
  satsuma mapping 'warehouse::load hub_store' --json | head -2
  # Output: { "name": "warehouse::load hub_store", ...

The text output is what humans and agents see first, so this makes it harder to identify which namespace a mapping belongs to.

## Notes

**2026-04-01**

Cause: `printDefault` in mapping.ts used `entry.name` (bare name) for the header instead of the canonical entity name. `printJson` already used `canonicalEntityName(entry)` correctly.
Fix: Changed `printDefault` to use `canonicalEntityName(entry)` for the name string, matching `printJson`.
