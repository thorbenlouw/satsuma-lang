---
id: sl-2ji3
status: open
deps: []
links: []
created: 2026-04-02T15:15:33Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [core, validator, diagnostics]
---
# Diagnostic line/column wrong for @refs in multiline NL strings

In validate.ts:347-348, the diagnostic position for unresolved-nl-ref warnings uses a naive calculation:

  line: item.line + 1
  column: item.column + offset + 1

This does not account for newlines inside multiline (triple-quoted) NL strings. When an @ref appears on line 2+ of a """ string, the reported line is the string's start line and the column is the raw character offset from the string start — both wrong.

Tested: an @ref on file line 12, column ~15 was reported as 9:38.

nl-ref.ts:664-669 already has a multiline-aware calculation that correctly handles newlines. The fix should extract this into a shared utility in satsuma-core and use it in both validate.ts and nl-ref.ts, so diagnostic positions are consistent everywhere.

## Acceptance Criteria

- Diagnostic line number points to the actual line containing the @ref, not the start of the NL string
- Diagnostic column number is the column on that line, not the offset from string start
- Both validate.ts and nl-ref.ts use the same position calculation (shared utility)
- Multiline NL ref tests cover @refs on lines 2+ of triple-quoted strings
- Existing single-line NL ref diagnostics remain correct

