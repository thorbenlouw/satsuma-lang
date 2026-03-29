---
id: sc-cim8
status: closed
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


## Notes

**2026-03-29T13:13:41Z**

**2026-03-29**

Cause: showArrows command was superseded by the new field-lineage ELK panel (sc-rdrc).
Fix: Deleted src/commands/arrows.ts; removed import and registration from extension.ts; removed command declaration and commandPalette entry from package.json.
