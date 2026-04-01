---
id: sl-w5fs
status: closed
deps: []
links: []
created: 2026-03-31T08:23:38Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fmt, exploratory-testing]
---
# parser-edge: fmt misaligns type column for multiline backtick field names

When a backtick-quoted field name contains a newline character, the formatter produces broken column alignment. The type keyword ends up on a separate line with incorrect indentation.

Repro:
  printf 'schema test {\n  \x60name with\nnewline\x60 STRING\n}\n' > /tmp/test.stm && npx satsuma fmt --stdin < /tmp/test.stm

Expected: reasonable formatting (either error on multiline backtick name, or correct alignment)
Actual: output is:
  schema bt_test {
    `name with
  newline`       STRING
    ...
  }
The type 'STRING' is misaligned because the formatter calculates column width including the line break. The padding spaces appear after 'newline`' on the second line.

Fixture: /tmp/satsuma-test-parser-edge/29-backtick-edge.stm

## Notes

**2026-04-01T21:00:00Z**

Cause: `calcFieldAlignment` and `formatSingleLineField` in `format.ts` used `name.length` for column width calculations. For backtick names containing newlines, `.length` includes the newline character, making the padding overflow onto the second line of the name.
Fix: Added `fieldNameDisplayWidth()` helper that returns `name.split('\n')` last-line length, and used it in both functions. Added a test in `fmt.test.ts`.
