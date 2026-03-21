---
id: sl-o4wq
status: open
deps: []
links: []
created: 2026-03-21T08:00:54Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, diff, exploratory-testing]
---
# diff: transform body changes in mapping arrows are not detected

When an arrow's transform pipeline changes (e.g. 'trim | title_case' becomes 'trim | uppercase'), the diff reports no structural differences. The diff only compares arrow counts, not individual arrow content.

What I did:
  satsuma diff /tmp/satsuma-test-diff/a_base.stm /tmp/satsuma-test-diff/b_changed_transform.stm

In a_base.stm:
  name   -> display_name  { trim | title_case }

In b_changed_transform.stm:
  name   -> display_name  { trim | uppercase }

Expected: Diff should report that the transform for the name -> display_name arrow changed.
Actual: 'No structural differences.'

Root cause: diffMapping() in tooling/satsuma-cli/src/diff.ts line 82-107 only compares arrowCount, sources, and targets. It has no access to individual arrow details (ArrowRecord) and performs no per-arrow comparison. The MappingRecord type only stores arrowCount as a number, not the individual arrows.

Reproduction files:
  /tmp/satsuma-test-diff/a_base.stm vs /tmp/satsuma-test-diff/b_changed_transform.stm

