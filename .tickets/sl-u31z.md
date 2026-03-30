---
id: sl-u31z
status: open
deps: []
links: []
created: 2026-03-30T06:37:59Z
type: chore
priority: 2
assignee: Thorben Louw
---
# format.ts: document NAME_CAP/TYPE_CAP constants and topLevelSep blank-line rules

tooling/satsuma-core/src/format.ts has two readability defects:

1. Lines 16-18: NAME_CAP=24 and TYPE_CAP=14 are bare magic numbers with no explanation. A reader cannot tell what these control, why those values were chosen, or what breaks if they change. They should be named constants with a comment explaining they govern column-alignment widths in formatted output.

2. Lines 152-182: topLevelSep() encodes blank-line rules between top-level constructs (import→import, import→block, block→block etc.) but the rules themselves are not documented. The return value of a single '\n' is described as '0 blank lines' in a comment which is confusing (one newline = end of current line, not a blank line). A reader has to reverse-engineer the blank-line semantics from the return values.

## Acceptance Criteria

- NAME_CAP and TYPE_CAP are extracted to named constants with a comment explaining they are column-alignment widths for name and type columns in formatted declarations, and noting that changing them will reformat all output
- topLevelSep() is preceded by a comment block (or internal table) that enumerates each (predecessor, successor) pair and the intended blank-line count, so the logic is checkable against the spec
- The '0 blank lines' / single-newline confusion is resolved with clear terminology
- All existing format tests pass

