---
id: sl-b0mq
status: closed
deps: []
links: []
created: 2026-03-31T08:29:44Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: where-used JSON uses '::name' prefix (with empty namespace) for bare-name queries

When querying `satsuma where-used <bare_name> --json` for a namespaced entity, the JSON output shows `"name": "::customers"` with a leading `::` separator but no namespace. The qualified query correctly shows `"name": "crm::customers"`. The text output is fine in both cases.

Repro:
  satsuma where-used customers --json   # "name": "::customers"
  satsuma where-used crm::customers --json   # "name": "crm::customers"

The name field should resolve to the canonical qualified name regardless of query form.


## Notes

**2026-04-01T11:11:08Z**

Cause: `canonicalKey(name)` used the raw user query string instead of the resolved index key, producing "::customers" for bare-name lookups instead of "crm::customers".
Fix: Changed to `canonicalKey(resolvedName)` in where-used.ts JSON and text output paths.
