---
id: sl-b1h0
status: closed
deps: []
links: []
created: 2026-03-22T07:45:21Z
type: bug
priority: 2
assignee: Thorben Louw
parent: sl-64yy
tags: [cli, where-used, exploratory-testing-2]
---
# where-used: duplicates transform spread references

When a transform is referenced via ...name spread syntax, where-used reports the reference twice (same line, same mapping). Bare name references are correctly reported once.

## Reproduction

```stm
schema src { field1 STRING; field2 STRING }
schema tgt { field1 STRING; field2 STRING }

transform my_xform { trim | lowercase }

mapping 'test' {
  source { `src` }
  target { `tgt` }
  field1 -> field1 { ...my_xform }
  field2 -> field2 { my_xform }
}
```

Run: `satsuma where-used my_xform <file>`

Expected: 2 references (one for the spread on field1, one for the bare ref on field2).
Actual: 3 references — the ...my_xform spread generates two identical entries both pointing to the same row. The bare my_xform generates one entry correctly.

## Root cause

The spread detection (added in d8aa1ac) likely adds the reference, and the existing bare-name detection also picks it up, resulting in a duplicate for spread syntax.

