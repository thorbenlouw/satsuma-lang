---
id: f2v-iv1v
status: open
deps: []
links: []
created: 2026-03-27T07:13:21Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase5]
---
# Phase 5.5: Mapping Detail component with three-column layout

New sz-mapping-detail component. Three columns: source schema cards (full fields) on left, mapping detail table in center, target schema card (full fields) on right. Center block has header (mapping name, sources, targets, joins, filters) and arrow table (source fields | transform | target field). Each/flatten blocks as nested sections.

## Acceptance Criteria

- Three-column layout renders correctly
- Mapping header shows name, sources, targets, join description, filters
- Arrow table shows all arrows with transform details
- Pipeline transforms show monospace steps with | separators
- NL transforms show italic green text
- Each/flatten blocks shown as labeled nested sections
- Click arrow row navigates to source location
- Click schema header navigates to schema source
- Click mapping header navigates to mapping source

