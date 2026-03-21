---
id: sl-tkex
status: open
deps: []
links: [sl-armj]
created: 2026-03-21T08:01:12Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, summary, exploratory-testing]
---
# summary: --json output missing fileCount field

The text output of 'satsuma summary' includes a file count in the header (e.g. 'Satsuma Workspace — 17 files') but the JSON output has no corresponding 'fileCount' field. JSON output should contain at least the same information as text output.

What I did:
  satsuma summary examples/ --json

What I expected:
  A 'fileCount' field in the JSON output (e.g. "fileCount": 17)

What actually happened:
  JSON top-level keys are: schemas, metrics, mappings, fragments, transforms, warningCount, questionCount, totalErrors. No fileCount.

The text output says 'Satsuma Workspace — 17 files' but the JSON has no way to get the file count.

Repro path: any directory, e.g. satsuma summary examples/ --json

