---
id: f2v-l9x2
status: open
deps: [f2v-jd4t, f2v-iv1v]
links: []
created: 2026-03-27T07:15:04Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase5]
---
# Phase 5.7: View transition wiring (overview <-> detail)

Wire the view transitions between overview and mapping detail. Arrow click in overview sets viewMode to mapping-detail. Back button in detail returns to overview. Toolbar shows back button + mapping name in detail mode. Ensure pan/zoom state resets on transition.

## Acceptance Criteria

- Clicking mapping arrow transitions to detail view
- Back button returns to overview
- Toolbar shows mapping name and back button in detail mode
- Pan/zoom resets on view transition
- View transition is smooth (no flicker)

