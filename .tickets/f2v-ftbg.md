---
id: f2v-ftbg
status: closed
deps: [f2v-k3do]
links: []
created: 2026-03-27T07:12:58Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase5]
---
# Phase 5.3: Schema-level thick arrow rendering with click-to-open

Update or create a mode on the edge layer that renders thick (3-4px) curved arrows between schema nodes. Each arrow labeled with mapping name at midpoint. Click dispatches SzOpenMappingEvent. Hover shows tooltip with mapping name, source->target, arrow count.

## Acceptance Criteria

- Thick arrows render between schema cards
- Mapping name label at arrow midpoint
- Click arrow opens mapping detail view
- Hover shows tooltip with mapping summary
- Orange for pipeline-heavy, green for NL-heavy mappings


## Notes

**2026-03-27T07:34:16Z**

Cause: No overview-level edge rendering existed for schema-to-schema thick arrows.
Fix: Created sz-overview-edge-layer component with thick (3px) curved Bezier arrows, mapping name labels at midpoints, click-to-open via SzOpenMappingEvent, hover tooltips with mapping summary and arrow count. Colors: orange for pipeline-heavy, green for NL-heavy, gray for bare mappings.
