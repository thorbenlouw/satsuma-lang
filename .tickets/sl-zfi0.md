---
id: sl-zfi0
status: closed
deps: []
links: []
created: 2026-03-22T07:45:39Z
type: bug
priority: 2
assignee: Thorben Louw
parent: sl-64yy
tags: [cli, mapping, exploratory-testing-2]
---
# mapping: container arrows have hasTransform:true but no transform key

Container arrows (those with children, e.g., Items[] -> items[] { ... }) report hasTransform: true and classification: "none" in --json output, but have no transform key.

## Reproduction

Run: `satsuma mapping 'sap po to mfcs' examples/sap-po-to-mfcs.stm --json`

Look at any container arrow (Items[] -> items[], POReferences[] -> ShipmentHeader.asnDetails[], etc.):

```json
{
  "src": "Items[]",
  "tgt": "items[]",
  "hasTransform": true,
  "classification": "none",
  "children": [...]
}
```

Expected: Either hasTransform: false (since the braces contain child arrows, not a transform pipeline), or include a transform key when hasTransform is true.

## Impact

Low — data model inconsistency that could confuse downstream consumers checking hasTransform to decide whether to read the transform field.

