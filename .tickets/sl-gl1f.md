---
id: sl-gl1f
status: closed
deps: []
links: []
created: 2026-03-24T08:13:24Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, warnings]
---
# warnings command omits //? (question/todo) comments

The `satsuma warnings` command only shows `//!` (warning) comments. Per SATSUMA-CLI.md, it should also show `//?` (question/todo) comments. The summary command correctly counts both types ('4 warning comments · 2 question comments') but the warnings command only outputs the //! entries.

Repro:
```bash
satsuma warnings bug-hunt/scenario-01-healthcare-hl7.stm
# Shows 4 //! comments, missing:
# Line 50: //? Should we normalize to UTC on ingest?
# Line 299: //? How do we match eligibility to the right insurance entry?
```

JSON output also only has `kind: 'warning'` with 4 items.

## Acceptance Criteria

1. `satsuma warnings` includes both //! and //? comments
2. Output distinguishes between warning (//!) and question (//?), e.g. different kind labels
3. `--json` output includes both types with distinct kind values
4. Counts in summary match the warnings output

