---
id: cbh-n4vm
status: closed
deps: []
links: [cbh-cyl0, cbh-y5og, cbh-h0or, cbh-ekvb, sl-xj4p]
created: 2026-03-25T11:17:18Z
type: bug
priority: 2
assignee: Thorben Louw
---
# arrows: NL-derived arrow source field incorrectly prefixed with mapping source schema

When an NL-derived arrow is created from a backtick reference in an NL transform, the JSON 'source' field incorrectly prepends the mapping's source schema name to the referenced field name.

- Exact command: satsuma arrows warehouse_products.sku /tmp/satsuma-bug-hunt/ --json
- Expected: The NL-derived arrow from 'nl reference test' mapping should have source 'warehouse_products.sku'
- Actual: source is 'raw_events.warehouse_products.sku' — the mapping's source schema 'raw_events' is prepended, creating an invalid triple-dotted field reference
- Test file: /tmp/satsuma-bug-hunt/edge-cases.stm (line 36)

