---
id: sl-xtpd
status: open
deps: []
links: []
created: 2026-03-22T07:45:50Z
type: bug
priority: 2
assignee: Thorben Louw
parent: sl-uasu
tags: [cli, schema, exploratory-testing-2]
---
# schema: --json --compact does not strip comments from fieldLines

Text --compact correctly strips comments from schema output, but --json --compact still includes comment lines in the fieldLines array.

## Reproduction

```stm
schema comment_test {
  id     INTEGER  (pk)
  // regular comment between fields
  //! warning between fields
  //? question between fields
  name   STRING
}
```

Run: `satsuma schema comment_test <file> --json --compact`

Expected: fieldLines should only contain field definitions, no comments.
Actual: fieldLines includes "// regular comment between fields", "//! warning between fields", "//? question between fields" alongside the field definitions.

Compare with text --compact which correctly omits the comments.

