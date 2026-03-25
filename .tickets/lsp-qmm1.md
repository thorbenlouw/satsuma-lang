---
id: lsp-qmm1
status: open
deps: [lsp-xdjz]
links: []
created: 2026-03-25T17:28:23Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-1, cli]
---
# P1.4: Update all 16 CLI commands for canonical refs

Update all command files in tooling/satsuma-cli/src/commands/ to emit canonical [ns]::schema.field references in JSON and text output.

## Acceptance Criteria

- All 16 commands produce canonical refs in both JSON and text modes
- No bare field names or inconsistent schema.field forms in output
- Tests updated for all commands

