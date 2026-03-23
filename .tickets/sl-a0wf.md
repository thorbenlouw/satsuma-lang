---
id: sl-a0wf
status: closed
deps: []
links: []
created: 2026-03-22T07:45:46Z
type: bug
priority: 2
assignee: Thorben Louw
parent: sl-uasu
tags: [cli, schema, exploratory-testing-2]
---
# schema: comments before first field or after last field are dropped

Comments between fields are correctly included in schema output, but comments before the very first field or after the very last field are silently dropped from both text and JSON output.

## Reproduction

```stm
schema comment_edges {
  // comment before first field
  id     INTEGER  (pk)
  name   STRING
  // comment after last field
}
```

Run: `satsuma schema comment_edges <file>`

Expected output:
```
schema comment_edges {
  // comment before first field
  id                      INTEGER (pk)
  name                    STRING
  // comment after last field
}
```

Actual output:
```
schema comment_edges {
  id                      INTEGER (pk)
  name                    STRING
}
```

Both comments are dropped. Comments between fields (e.g., between id and name) are rendered correctly.

