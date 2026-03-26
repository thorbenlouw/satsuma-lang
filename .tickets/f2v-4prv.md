---
id: f2v-4prv
status: closed
deps: []
links: []
created: 2026-03-26T23:35:11Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz]
---
# Hover field row highlights upstream/downstream lineage arrows

When hovering over a field row in a schema card, highlight (thicken) all arrows that connect to that field — both upstream sources and downstream targets — to make the lineage path visually obvious.

## Acceptance Criteria

- Hovering a field row in a schema card highlights all connected arrows
- Upstream arrows (pointing to this field) are highlighted with thicker stroke
- Downstream arrows (from this field to targets) are also highlighted
- Non-connected arrows dim slightly for contrast
- Highlight clears when mouse leaves the field row


## Notes

**2026-03-26T23:38:01Z**

Field hover dispatches SzFieldHoverEvent with schemaId and fieldName. Root component passes them to edge layer. Edge layer dims all non-matching edges (opacity 0.15) and highlights matching edges (stroke-width 3). Edge metadata (sourceNode, targetNode, arrow) now populated from layout engine.
