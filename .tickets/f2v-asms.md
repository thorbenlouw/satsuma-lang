---
id: f2v-asms
status: closed
deps: []
links: []
created: 2026-03-26T23:15:46Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase4]
---
# Phase 4: Fragment spread indicators on consuming schemas

Show dotted outline indicators on schema cards where fragment fields have been spread (inlined). Visually distinguish spread fields from native fields.

## Acceptance Criteria

- Fields from fragment spreads show a dotted outline indicator
- Spread indicator links visually to the source fragment card
- Native fields remain visually distinct from spread fields


## Notes

**2026-03-26T23:30:36Z**

Added spreads[] field to SchemaCard in VizModel and viz-model.ts extraction. Schema cards now show dotted green spread indicators listing fragment names that are spread into the schema.
