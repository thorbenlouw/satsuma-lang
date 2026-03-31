---
id: sl-dsp4
status: open
deps: []
links: []
created: 2026-03-31T08:25:27Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, exploratory-testing]
---
# diff: --json output includes undocumented 'notes' key

The diff --json output includes a top-level 'notes' key with {"added": [], "removed": []} structure, but the --help JSON shape documentation does not mention it. The documented shape only lists: schemas, mappings, metrics, fragments, transforms.

Additionally, the 'notes' tracking appears non-functional — standalone note blocks that are added or changed between workspaces always show empty added/removed arrays (see related ticket on note block changes not detected).

