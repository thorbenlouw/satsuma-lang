---
id: sl-djeo
status: closed
deps: []
links: [sl-wvn8]
created: 2026-03-21T08:02:12Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl-refs, exploratory-testing]
---
# nl-refs: line number for refs in multiline strings reports string start, not actual line

When backtick references appear in triple-quoted (multiline) NL strings inside arrow transforms, the `line` field in the output always reports the line where the `"""` string starts, not the actual line where the backtick reference appears.

What I did:
  satsuma nl-refs /tmp/satsuma-test-nl-refs/multiline-nl.stm --json

The file contains (lines 21-23):
  line 21: """Concatenate \`first_name\` and \`last_name\`
  line 22: with proper capitalization.
  line 23: Handle NULL \`first_name\` by using \`last_name\` only."""

Expected:
  - first_name (1st occurrence) -> line 20 (0-indexed) -- correct
  - last_name (1st occurrence) -> line 20 (0-indexed) -- correct
  - first_name (2nd occurrence) -> line 22 (0-indexed, actual physical line)
  - last_name (2nd occurrence) -> line 22 (0-indexed, actual physical line)

Actual:
  All four refs report line 20 (0-indexed).

The bug is in the extraction phase (nl-ref-extract.ts extractMappingNLRefs/walkArrowsForNL). The line is captured as `innerNode.startPosition.row` which is the start of the multiline_string node, not adjusted for the offset within the text. The column offset would also be wrong for refs on subsequent lines (it would be relative to the string start column, not the beginning of the actual line).

Reproducing fixture: /tmp/satsuma-test-nl-refs/multiline-nl.stm


## Notes

**2026-03-22T01:01:27Z**

Fixed line number computation in resolveAllNLRefs to count newlines before the backtick offset and adjust the line accordingly. Column is also corrected for refs on subsequent lines. Added integration test. All 589 tests pass.
