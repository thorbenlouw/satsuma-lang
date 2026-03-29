---
id: sc-cim8
status: open
deps: [sc-p8h0]
links: []
created: 2026-03-29T12:53:52Z
type: chore
priority: 2
assignee: Thorben Louw
tags: [vscode, phase-2, cleanup]
---
# vscode: remove showArrows command (superseded by field-lineage panel)

Delete src/commands/arrows.ts. Remove all registrations of satsuma.showArrows from extension.ts. Remove the command and all menu entries from package.json. Verify no other file imports from arrows.ts. Update CHANGELOG or any docs that reference the command.

## Acceptance Criteria

- src/commands/arrows.ts deleted
- satsuma.showArrows does not appear in command palette or any context menu
- Extension compiles and activates cleanly
- No remaining imports or references to showArrows in the codebase

