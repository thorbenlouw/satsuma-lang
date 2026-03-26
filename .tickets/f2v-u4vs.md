---
id: f2v-u4vs
status: open
deps: []
links: []
created: 2026-03-26T23:03:41Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase1]
---
# Phase 1.4: Inline note rendering with markdown

Render note blocks inline in schema/metric/fragment cards. Add a small markdown-to-HTML library (marked with tree-shaking or similar). Notes should be collapsible with a note indicator icon.

## Acceptance Criteria

- Note blocks from VizModel render as styled markdown inside cards
- Notes are collapsible (collapsed by default)
- Click note indicator expands/collapses
- File-level notes render in a collapsible pane
- No XSS via note content (sanitized output)

