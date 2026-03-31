---
id: sl-edrw
status: open
deps: []
links: []
created: 2026-03-31T08:24:54Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, exploratory-testing]
---
# diff: arrow transform changes not detected

When a mapping arrow's transform body changes (e.g. '| trim | upper' to '| trim | lower', or NL transform text changes), diff reports 'No structural differences'. The diff only compares arrow endpoints (source.field -> target.field) but ignores the transform/pipeline attached to each arrow. This means any change to how data is transformed between source and target fields is invisible to diff.

Repro:
v1: src.name -> tgt.name | trim | upper
v2: src.name -> tgt.name | trim | lower
Result: 'No structural differences' (expected: arrow transform changed)

Also applies to NL transforms:
v1: src.desc -> tgt.desc | "Extract first sentence"
v2: src.desc -> tgt.desc | "Extract first paragraph and normalize whitespace"
Result: 'No structural differences'

