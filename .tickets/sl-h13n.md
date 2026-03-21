---
id: sl-h13n
status: open
deps: [sl-ck20]
links: [sl-cyen]
created: 2026-03-21T08:01:25Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, diff, exploratory-testing]
---
# diff: mapping arrow changes only report count delta, not individual arrow additions/removals

When arrows are added to or removed from a mapping, the diff only reports the count change (e.g. 'arrows: 4 -> 3') without identifying which specific arrows were added or removed. This makes the diff output insufficient for understanding what actually changed in a mapping.

What I did:
  satsuma diff /tmp/satsuma-test-diff/a_base.stm /tmp/satsuma-test-diff/b_added_arrow.stm
  satsuma diff /tmp/satsuma-test-diff/a_base.stm /tmp/satsuma-test-diff/b_removed_arrow.stm

For added arrow:
  Text output: '~ crm to warehouse\n      ~ arrows: 4 -> 5'
  JSON output: { kind: 'arrow-count-changed', from: 4, to: 5 }

For removed arrow (email -> email_address was removed):
  Text output: '~ crm to warehouse\n      ~ arrows: 4 -> 3'

Expected: Diff should identify which arrows were added or removed, e.g.:
  + -> email_address (derived)
  - email -> email_address

Actual: Only shows count delta with no detail about which arrows changed.

Furthermore, when the same number of arrows exist but an arrow's source or target field path changes, the diff would report 'No structural differences' since the count hasn't changed.

Root cause: MappingRecord only stores arrowCount (a number), not individual arrow data. diffMapping() in diff.ts compares arrowCount numerically. The workspace index stores arrows in fieldArrows but the diff code doesn't use them.

Reproduction files:
  /tmp/satsuma-test-diff/a_base.stm vs /tmp/satsuma-test-diff/b_added_arrow.stm
  /tmp/satsuma-test-diff/a_base.stm vs /tmp/satsuma-test-diff/b_removed_arrow.stm

