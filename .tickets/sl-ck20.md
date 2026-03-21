---
id: sl-ck20
status: open
deps: []
links: [sl-cyen]
created: 2026-03-21T08:00:37Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, diff, exploratory-testing]
---
# diff: metrics, fragments, and transform blocks are completely invisible to structural comparison

The diff command only compares schemas and mappings. It completely ignores metrics, fragments, and transform blocks. The Delta type only has schemas and mappings properties, and diffIndex() only calls diffBlockMap on those two collections.

What I did:
  satsuma diff /tmp/satsuma-test-diff/a_metrics.stm /tmp/satsuma-test-diff/b_metrics_added.stm
  satsuma diff /tmp/satsuma-test-diff/a_fragments.stm /tmp/satsuma-test-diff/b_fragments_added.stm
  satsuma diff /tmp/satsuma-test-diff/a_transforms.stm /tmp/satsuma-test-diff/b_transforms_added.stm

Expected: Each should report added/removed blocks for the respective type.
Actual: All three report 'No structural differences.' and the JSON output only contains schemas and mappings keys.

Reproduction files:
  /tmp/satsuma-test-diff/a_metrics.stm vs /tmp/satsuma-test-diff/b_metrics_added.stm (added metric)
  /tmp/satsuma-test-diff/a_metrics.stm vs /tmp/satsuma-test-diff/b_metrics_removed.stm (removed metric)
  /tmp/satsuma-test-diff/a_fragments.stm vs /tmp/satsuma-test-diff/b_fragments_added.stm (added fragment)
  /tmp/satsuma-test-diff/a_fragments.stm vs /tmp/satsuma-test-diff/b_fragments_removed.stm (removed fragment)
  /tmp/satsuma-test-diff/a_transforms.stm vs /tmp/satsuma-test-diff/b_transforms_added.stm (added transform)
  /tmp/satsuma-test-diff/a_transforms.stm vs /tmp/satsuma-test-diff/b_transforms_removed.stm (removed transform)

Root cause: diffIndex() in tooling/satsuma-cli/src/diff.ts line 21-26 only compares indexA.schemas and indexA.mappings. The Delta interface (types.ts line 223-226) only has schemas and mappings fields. WorkspaceIndex has metrics, fragments, and transforms maps that are never compared.

