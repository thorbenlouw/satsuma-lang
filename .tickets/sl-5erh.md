---
id: sl-5erh
status: open
deps: []
links: []
created: 2026-03-21T08:00:49Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl-refs, exploratory-testing]
---
# nl-refs: column offset is off by one in JSON output

The `column` field in `satsuma nl-refs --json` output is consistently off by one (too low). The column points to the character before the opening backtick, not the backtick itself.

Root cause: In tooling/satsuma-cli/src/nl-ref-extract.ts line 308, the column is computed as `item.column + offset`. `item.column` is the start column of the nl_string node (which is the opening double-quote `"`), and `offset` is the position of the backtick within the extracted text (after stripping the opening quote). The correct formula should be `item.column + 1 + offset` to account for the opening quote character.

What I did:
  satsuma nl-refs /tmp/satsuma-test-nl-refs/basic-refs.stm --json

Line 21 of the file is:
  `  amount -> total { "Sum \`amount\` grouped by \`customer_id\`" }`

Expected column for \`amount\`: 25 (the backtick char)
Actual column reported: 24 (the space before the backtick)

Expected column for \`customer_id\`: 45
Actual column reported: 44

This pattern is consistent across all test files. Confirmed with /tmp/satsuma-test-nl-refs/namespace-refs.stm as well (expected 49, got 48).

Reproducing fixture: /tmp/satsuma-test-nl-refs/basic-refs.stm

