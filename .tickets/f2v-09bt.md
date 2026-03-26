---
id: f2v-09bt
status: closed
deps: []
links: []
created: 2026-03-26T23:15:53Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase4]
---
# Phase 4: Minimap for large diagrams

Add a minimap overview in the corner of the visualization viewport for large diagrams. Shows a scaled-down outline of all cards with a viewport indicator rectangle. Click or drag on the minimap to navigate.

## Acceptance Criteria

- Minimap appears in the bottom-right corner for diagrams exceeding viewport
- Shows scaled outlines of all cards
- Viewport indicator rectangle shows current visible area
- Click on minimap navigates to that area
- Drag on minimap pans the viewport


## Notes

**2026-03-26T23:32:43Z**

Minimap renders as a 160x100px overlay in the bottom-right of the viewport. Shows scaled-down card outlines and an orange viewport rectangle. Click on minimap navigates to that area.

**2026-03-26T23:34:15Z**

Minimap renders as a 160x100px overlay in the bottom-right. Click navigates.
