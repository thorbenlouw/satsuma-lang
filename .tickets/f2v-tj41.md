---
id: f2v-tj41
status: closed
deps: []
links: []
created: 2026-03-26T23:03:48Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase1]
---
# Phase 1.5: Add editor title eye icon for .stm files

Add an editor title button (eye icon) that opens the mapping visualization beside the editor when viewing .stm files. Currently only the command palette entry exists.

## Acceptance Criteria

- Eye icon appears in editor title bar for .stm files
- Clicking opens VizPanel beside the active editor
- Icon uses appropriate codicon (e.g. eye)


## Notes

**2026-03-26T23:05:34Z**

Already implemented — editor/title menu entry with eye icon exists in package.json lines 61-67, command has icon: $(eye) at line 50.
