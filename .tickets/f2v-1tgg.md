---
id: f2v-1tgg
status: closed
deps: []
links: []
created: 2026-03-26T23:39:18Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, ux]
---
# Add Satsuma commands to editor context menu for .stm files

Register Satsuma commands (Show Mapping Visualization, Trace Field Lineage, etc.) in the editor/context menu so they appear on right-click when editing .stm files. Currently they are only in the command palette.

## Acceptance Criteria

- Right-clicking in a .stm file shows Satsuma commands in the context menu
- Commands are grouped under a Satsuma submenu or section
- Commands only appear when editorLangId == satsuma
- Commands work when invoked from the context menu


## Notes

**2026-03-26T23:46:18Z**

Five Satsuma commands added to editor/context menu: Show Viz, Where Used, Show Arrows, Trace Lineage, Show Coverage. Grouped under satsuma@ groups.
