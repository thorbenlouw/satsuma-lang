---
id: sl-1meq
status: closed
deps: []
links: []
created: 2026-03-31T08:25:02Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, exploratory-testing]
---
# diff: metric source, grain, and slice changes not detected

Diff does not detect changes to metric metadata properties: source list, grain value, or slice list. Only field-level changes within metrics are detected.

Repro 1 - source change:
v1: metric revenue (grain=daily) { source { orders } ... }
v2: metric revenue (grain=daily) { source { orders, returns } ... }
Result: 'No structural differences' (expected: sources changed)

Repro 2 - grain change:
v1: metric revenue (grain=daily) { ... }
v2: metric revenue (grain=monthly) { ... }
Result: only reports field changes, not grain change

Repro 3 - slice change:
v1: slice { channel }
v2: slice { channel, region }
Result: 'No structural differences'

Note: mapping source/target changes ARE correctly detected, so this is specific to metric blocks.


## Notes

**2026-04-01T07:40:46Z**

**2026-03-31T12:00:00Z**

Cause: Metric comparison logic was already present. Original report used invalid metadata syntax causing incorrect extraction.
Fix: Verified comparison works with canonical syntax. Added explicit test coverage for source, grain, and slices change detection.
