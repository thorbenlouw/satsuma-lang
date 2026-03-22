---
id: sl-udpf
status: closed
deps: []
links: [sl-2usp]
created: 2026-03-22T07:45:11Z
type: bug
priority: 1
assignee: Thorben Louw
parent: sl-qxkf
tags: [cli, nl-refs, line-numbers, exploratory-testing-2]
---
# nl-refs: line numbers off by 1 for single-line, off by 2 for triple-quoted strings

The line field in nl-refs --json output is systematically wrong:
- Single-line strings: reported line = actual line - 1
- Triple-quoted strings: reported line = actual line - 2

## Reproduction (single-line)

Run: `satsuma nl-refs examples/sfdc_to_snowflake.stm --json`

Ref `fx_spot_rates` reported at line 75. Actual location is line 76 ("Multiply by rate from \`fx_spot_rates\`..."). Line 75 is the arrow declaration `Amount -> amount_usd {`.

## Reproduction (triple-quoted)

In the same file, ref `Opportunity` is reported at line 8. Actual location is line 10 (inside a """ block that opens on line 7). The offset is consistently 2 for all refs inside triple-quoted strings.

## Note

The nl command's own line numbers are correct. This bug is specific to nl-refs, suggesting the line calculation in nl-ref-extract.ts has a different off-by-one path than the one fixed in sl-djeo.


## Notes

**2026-03-22T09:39:44Z**

**2026-03-22T12:00:00Z**

Cause: Two issues: (1) nl-refs JSON output used 0-indexed line from tree-sitter without converting to 1-indexed. (2) Triple-quoted string text was `.trim()`ed, stripping the leading newline after `"""`, which caused newline counting to be off by 1 additional line for multiline strings.
Fix: Removed `.trim()` from all `.slice(3, -3)` calls in nl-ref-extract.ts to preserve leading newline for accurate offset calculation. Added `line: r.line + 1` conversion in nl-refs.ts JSON output path.
