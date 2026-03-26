---
id: f2v-cd0p
status: open
deps: []
links: [f2v-2wac]
created: 2026-03-26T23:15:15Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase3]
---
# Phase 3: Right-side notes pane with styled markdown cards

Implement a collapsible right-side panel that renders file-level note blocks as styled markdown cards. Group by severity: warnings first, then questions. Render notes as markdown with a lightweight sanitized renderer.

## Acceptance Criteria

- Collapsible right-side pane shows file-level notes
- Notes rendered as styled markdown cards (cream/white card styling)
- Comments grouped by severity (warnings first, then questions)
- Pane collapsed by default if no file-level notes exist
- Markdown sanitized to prevent XSS

