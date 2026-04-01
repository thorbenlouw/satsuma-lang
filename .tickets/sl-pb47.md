---
id: sl-pb47
status: closed
deps: []
links: []
created: 2026-03-31T08:32:19Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: warnings JSON output drops namespace prefix from block name

The `warnings` command's JSON output uses bare block names instead of namespace-qualified names. For a warning inside `namespace crm { schema customers { ... } }`, the JSON shows `"block": "customers"` instead of `"block": "crm::customers"`.

Repro:
  satsuma warnings /tmp/satsuma-test-ns-import/warnings --json
  # Output: { "block": "customers", ... }
  # Expected: { "block": "crm::customers", ... }

This makes it impossible for consumers to disambiguate warnings from same-named schemas in different namespaces.

## Notes

**2026-04-01**

Cause: `findParentBlock` in extract.ts (satsuma-core) returned the bare block name without checking for an enclosing `namespace_block` ancestor, so the `parent` field was always unqualified.
Fix: Added `qualifyWithNamespace` helper that walks up the CST to find a `namespace_block` and prefixes the name (e.g. "crm::customers" instead of "customers").
