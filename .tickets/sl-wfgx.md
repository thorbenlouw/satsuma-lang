---
id: sl-wfgx
status: closed
deps: []
links: []
created: 2026-03-31T08:29:34Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: nl command uses query-form name instead of canonical qualified name in scope label

The `nl` command's scope label (both text and JSON) echoes back whatever name the user typed rather than resolving to the canonical namespace-qualified name. This means:
- `satsuma nl 'load dim_customer'` shows `(load dim_customer)` in text and `"parent": "load dim_customer"` in JSON
- `satsuma nl 'warehouse::load dim_customer'` shows `(warehouse::load dim_customer)` and `"parent": "warehouse::load dim_customer"`

The parent/scope should always be the canonical fully qualified name regardless of how the user queried it.

Repro:
  satsuma nl 'load dim_customer' --json
  # parent: 'load dim_customer'
  satsuma nl 'warehouse::load dim_customer' --json
  # parent: 'warehouse::load dim_customer'


## Notes

**2026-03-31T08:32:49Z**

Also affects: meta (header label), where-used (text header), and fields --unmapped-by (result text). All these commands echo the user's query form instead of resolving to the canonical namespace-qualified name. Root cause is the same: name canonicalization should happen before rendering output.

## Notes

**2026-04-01**

Cause: Multiple commands passed the raw user query string (`blockName`, `name`, `schemaName`) to output formatters instead of the resolved canonical index key.
Fix: nl.ts passes `key` (resolved) to `extractNLContent`; meta.ts returns `scope: resolvedName`; where-used.ts passes `resolvedName` to text output and `printDefault`; fields.ts uses `resolvedSchemaName` in "all mapped" / "no fields" messages.
