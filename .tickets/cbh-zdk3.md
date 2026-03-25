---
id: cbh-zdk3
status: open
deps: []
links: [cbh-ekvb]
created: 2026-03-25T11:16:54Z
type: bug
priority: 2
assignee: Thorben Louw
---
# mapping: arrowCount double-counts flatten/each blocks and their children

DETAILED DESCRIPTION:
- Command: satsuma mapping 'order flattening' /tmp/satsuma-bug-hunt/ --json
- Also affects: satsuma mapping 'po to warehouse' /tmp/satsuma-bug-hunt/ --json, and summary arrow counts
- Expected: arrowCount should count actual field-level mappings. For 'order flattening': 3 outer maps + 4 inner flatten maps = 7 field mappings.
- Actual: arrowCount is 8. The flatten block is counted as 1 arrow AND its 4 children are also counted (1 + 4 + 3 = 8). The flatten/each container is not a field mapping — it's a structural grouping.
- Same pattern for 'po to warehouse': arrowCount is 8 = 1 (each block) + 4 (each children) + 3 (outer maps). Actual field mappings = 7.
- This inflated count appears in satsuma summary output too, making it look like mappings have more field transformations than they actually do.
- The JSON structure correctly nests children under the flatten/each block, but arrowCount adds the container to the total.
- File: /tmp/satsuma-bug-hunt/mappings.stm (order flattening line 76, po to warehouse line 103)

