---
id: sl-4gio
status: closed
deps: []
links: []
created: 2026-03-22T07:44:36Z
type: bug
priority: 1
assignee: Thorben Louw
parent: sl-a778
tags: [cli, diff, exploratory-testing-2]
---
# diff: does not detect schema-level note text changes

Changing a schema's declaration-level note text produces "No structural differences."

## Reproduction

v1.stm:
```stm
schema source_data (note "Raw source data") {
  id INTEGER (pk)
}
```

v2.stm:
```stm
schema source_data (note "Updated raw source data description") {
  id INTEGER (pk)
}
```

Run: `satsuma diff v1.stm v2.stm`

Expected: A change reported under schemas > source_data showing the note text change.
Actual: "No structural differences."

## Root cause

In diff.ts, diffSchema() only compares a.fields vs b.fields and ignores the schema-level note/metadata text.

