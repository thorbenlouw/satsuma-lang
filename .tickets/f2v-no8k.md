---
id: f2v-no8k
status: closed
deps: [f2v-davz]
links: []
created: 2026-03-26T23:14:59Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase2]
---
# Phase 2: Animate lineage expansion with slide transitions

When cross-file schemas are expanded, animate the new cards sliding in from left (upstream) or right (downstream). Track expansion depth and allow collapse back to single-file view.

## Acceptance Criteria

- New cards animate in with a slide transition
- Expansion depth is tracked per schema
- Collapse button removes expanded cards with reverse animation
- Collapsing returns to single-file view


## Notes

**2026-03-26T23:22:44Z**

CSS slideInRight animation applied to expanded cards via .positioned-card.expanded class. Animation: 0.3s ease-out slide from +40px.
