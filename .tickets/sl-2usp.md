---
id: sl-2usp
status: closed
deps: []
links: [sl-udpf]
created: 2026-03-22T07:45:03Z
type: bug
priority: 1
assignee: Thorben Louw
parent: sl-qxkf
tags: [cli, schema, line-numbers, exploratory-testing-2]
---
# schema: row in --json output is 0-indexed instead of 1-indexed

The row field in schema --json output is consistently 0-indexed (tree-sitter raw), despite the sl-m02g fix that standardized on 1-indexed line numbers.

## Reproduction

Given a file where the schema starts on line 4:

```stm
// line 1
// line 2
// line 3
schema country_codes {
  code    STRING(3)
  name    STRING(100)
}
```

Run: `satsuma schema country_codes <file> --json`

Expected: "row": 4
Actual: "row": 3

Verified across multiple files — the row value is always exactly 1 less than the actual file line number. The sl-m02g fix may have missed the schema command, or the schema command reads the row from a different code path than the one that was fixed.


## Notes

**2026-03-22T09:39:35Z**

**2026-03-22T12:00:00Z**

Cause: Schema command outputs tree-sitter's 0-indexed `startPosition.row` directly without converting to 1-indexed.
Fix: Added `+ 1` to `row: entry.row` in `schema.ts` JSON output.
