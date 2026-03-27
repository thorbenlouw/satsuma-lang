---
id: f2v-jd4t
status: open
deps: [f2v-ukjt, f2v-k3do, f2v-ftbg]
links: []
created: 2026-03-27T07:13:13Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase5]
---
# Phase 5.4: Graph Overview rendering with view mode state

Add _viewMode state (overview | mapping-detail) to root satsuma-viz component. Default to overview. Add _renderOverview() that uses compact schema cards + schema-level edges. Track _selectedMapping for transitions. Toolbar adapts per view mode.

## Acceptance Criteria

- Default view shows compact schema cards with thick mapping arrows
- No field-level detail visible in overview
- Namespace grouping with bordered boxes and labels
- Pan/zoom/minimap/toolbar all work in overview mode
- Clicking a mapping arrow sets _selectedMapping and transitions view

