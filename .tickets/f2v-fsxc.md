---
id: f2v-fsxc
status: open
deps: []
links: []
created: 2026-03-26T23:16:00Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase4]
---
# Phase 4: Export to SVG/PNG

Add export functionality to render the current visualization view as an SVG or PNG file. Headless render of the current view state including cards, edges, and namespace boxes.

## Acceptance Criteria

- Export button in toolbar offers SVG and PNG options
- SVG export produces a standalone SVG file with embedded styles
- PNG export renders at 2x resolution for clarity
- Export captures current view state (including collapsed/expanded cards)

