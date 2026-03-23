---
id: sl-7ow3
status: closed
deps: []
links: []
created: 2026-03-22T07:44:44Z
type: bug
priority: 1
assignee: Thorben Louw
parent: sl-a778
tags: [cli, diff, exploratory-testing-2]
---
# diff: does not detect transform block body text changes

Changes to standalone transform block body text are silently ignored by diff.

## Reproduction

v1.stm:
```stm
transform 'clean address' {
  trim | lowercase | replace("  ", " ")
}
```

v2.stm:
```stm
transform 'clean address' {
  trim | lowercase | replace("  ", " ") | capitalize
}
```

Run: `satsuma diff v1.stm v2.stm --json`

Expected: transforms.changed should list "clean address" with the body text change.
Actual: transforms.changed is an empty array.

## Root cause

In diff.ts, the transform diff uses a no-op comparator: `diffBlockMap(indexA.transforms, indexB.transforms, () => [])`. It never compares transform body text.

