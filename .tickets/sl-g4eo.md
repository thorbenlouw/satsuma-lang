---
id: sl-g4eo
status: closed
deps: []
links: []
created: 2026-04-01T07:15:55Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [bug, performance]
---
# diff.ts: O(n²) reverse-map lookup when resolving mapping/metric keys

In diffIndex, the mapping and metric keys are recovered by spreading the entire Map and doing a linear value-equality scan:

```ts
const mappingKey = [...indexA.mappings.entries()].find(([, v]) => v === a)?.[0] ?? "";
const metricKey  = [...indexA.metrics.entries()].find(([, v]) => v === a)?.[0] ?? "";
```

This runs once per entry in the changed set, making the overall diff O(n²) over the mapping/metric count. Since diffBlockMap already iterates the map by key, the key should be threaded through the callback rather than recovered by reverse scan.

**Fix:** Pass the key alongside the value in diffBlockMap's callback signature, eliminating the need for the reverse lookup entirely.


## Notes

**2026-04-01T07:40:39Z**

**2026-03-31T12:00:00Z**

Cause: diffBlockMap callback did not receive the map key, forcing O(n^2) reverse scan.
Fix: Added key parameter to diffBlockMap diffFn callback, eliminating all reverse-map lookups.
