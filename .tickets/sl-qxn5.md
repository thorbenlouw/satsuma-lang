---
id: sl-qxn5
status: closed
deps: []
links: []
created: 2026-03-31T08:30:19Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, namespace, import, exploratory-testing]
---
# namespace/import: NL-derived arrow duplicates explicit arrow when @ref references the arrow's own source field

When an NL transform string contains a namespace-qualified @ref that references the same source field as the arrow itself (e.g., `email -> email { "Normalize @crm::customers.email" }`), the CLI creates a redundant NL-derived arrow alongside the explicit arrow:

  email -> email { ... }  [nl]           # explicit arrow
  crm::customers.email -> email { (NL ref) }  [nl-derived]  # duplicate

The NL-derived arrow is supposed to surface implicit data dependencies not captured by explicit arrows. When the @ref merely references the source field of the containing arrow, the derived arrow adds noise without new lineage information.

Repro:
  cd /tmp/satsuma-test-ns-import/ns-refs-only
  satsuma arrows crm::customers.email
  # Shows 2 arrows: the explicit email->email and a redundant NL-derived arrow

This likely also affects non-namespace @refs (e.g., `@source.field` on an arrow from source.field).

## Notes

**2026-04-01**

Cause: `nlMappingKey` in arrows.ts was constructed as `${nlRef.namespace}::${nlRef.mapping}`, but `nlRef.mapping` is already the fully-qualified key produced by `resolveAllNLRefs` (e.g. "crm::load_dim_customer"). This double-qualified the namespace, causing `index.mappings.get(nlMappingKey)` to return null, leaving `srcSchemas` empty and the dedup check unable to match the existing arrow's source field.
Fix: Changed to `const nlMappingKey = nlRef.mapping` since `resolveAllNLRefs` already produces the fully-qualified mapping key.
