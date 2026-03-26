---
id: f2v-8cha
status: closed
deps: [f2v-davz]
links: []
created: 2026-03-26T23:15:06Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase2]
---
# Phase 2: Breadcrumb trail for lineage expansion path

Add a breadcrumb trail showing the chain of files that have been expanded during cross-file lineage exploration. Clicking a breadcrumb collapses back to that level.

## Acceptance Criteria

- Breadcrumb trail appears below toolbar when expansion depth > 0
- Shows file names in expansion order
- Click a breadcrumb collapses to that level
- Breadcrumb disappears when back to single-file view


## Notes

**2026-03-26T23:22:44Z**

Breadcrumb bar renders below toolbar when expansions active. Shows primary file, expanded file names with via-schema tooltips. Click breadcrumb toggles that expansion. Collapse All button clears all expansions.
