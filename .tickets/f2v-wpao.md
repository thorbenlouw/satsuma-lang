---
id: f2v-wpao
status: open
deps: [f2v-u4vs]
links: []
created: 2026-03-26T23:03:55Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase1]
---
# Phase 1.6: Toolbar with Schema Only, Show Notes, Fit, Refresh controls

Add a toolbar above the visualization canvas with: Schema Only toggle (hides arrows/transforms), Show Notes toggle, Fit-to-viewport button, Refresh button, and namespace filter dropdown when namespaces are present.

## Acceptance Criteria

- Toolbar renders above canvas with all 5 controls
- Schema Only toggle hides/shows arrows and transforms
- Show Notes toggle hides/shows note indicators and pane
- Fit button resets zoom/pan to fit all content
- Refresh button re-fetches VizModel from LSP
- Namespace filter dropdown appears when namespaces exist
- Toolbar persists across model updates

