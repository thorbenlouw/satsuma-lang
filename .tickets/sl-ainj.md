---
id: sl-ainj
status: open
deps: []
links: []
created: 2026-03-22T07:44:40Z
type: bug
priority: 1
assignee: Thorben Louw
parent: sl-a778
tags: [cli, diff, exploratory-testing-2]
---
# diff: does not detect mapping-level note block changes

Adding or changing a note { } block inside a mapping is completely invisible to diff.

## Reproduction

v1.stm:
```stm
schema src { id INTEGER }
schema tgt { id INTEGER }

mapping 'source to target' {
  source { `src` }
  target { `tgt` }
  id -> id
}
```

v2.stm:
```stm
schema src { id INTEGER }
schema tgt { id INTEGER }

mapping 'source to target' {
  source { `src` }
  target { `tgt` }
  note { "This mapping has been updated with new business logic." }
  id -> id
}
```

Run: `satsuma diff v1.stm v2.stm`

Expected: A change reported under mappings > 'source to target' (note block added).
Actual: "No structural differences."

## Root cause

In diff.ts, diffMapping() compares sources, targets, and arrows but never checks for note blocks inside the mapping.

