---
id: f2v-u4vs
status: closed
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


## Notes

**2026-03-26T23:08:24Z**

Notes rendered inline in schema, metric, and fragment cards as collapsible sections. File-level notes shown as a collapsible pane above the canvas. No markdown library needed — notes are plain text with pre-wrap styling.
