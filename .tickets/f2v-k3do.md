---
id: f2v-k3do
status: open
deps: []
links: []
created: 2026-03-27T07:12:50Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase5]
---
# Phase 5.2: Schema-level ELK layout (no field ports)

Add computeOverviewLayout(model) to elk-layout.ts. Creates compact nodes without per-field ports, one edge per MappingBlock (sourceRefs to targetRef). Returns OverviewLayoutResult with LayoutNode[] and OverviewEdge[] carrying the full MappingBlock reference.

## Acceptance Criteria

- computeOverviewLayout produces valid ELK layout for all example files
- Nodes sized for compact card height (no fields)
- One edge per mapping, not per arrow
- Namespace compound nodes still used for grouping
- No ELK errors from missing ports

