---
id: ser-w6z4
status: closed
deps: [ser-3g1j]
links: []
created: 2026-03-26T18:11:46Z
type: task
priority: 1
assignee: Thorben Louw
---
# Implement <satsuma-viz> root component and <sz-schema-card>

Build the core web components:
- <satsuma-viz> root component: accepts VizModel, lays out cards, dispatches navigate events
- <sz-schema-card>: header (icon, name, mapped/total, collapse toggle), field list with port dots, constraint badges (pk, req, pii, idx), filled/hollow dots for mapped/unmapped fields
Acceptance:
- Schema card renders correctly with all field types
- Constraint badges display as styled pills
- Mapped vs unmapped fields distinguished by filled/hollow dots
- Header shows mapped/total field count
- Collapse/expand works


## Notes

**2026-03-26T22:35:31Z**

## Notes

**2026-03-26T19:10:00Z**

Cause: Cards needed for visualization renderer.
Fix: Implemented as part of ser-3g1j package setup — <satsuma-viz> root component and <sz-schema-card> with all field rendering, port dots, constraint badges, mapped/unmapped indicators, and collapse/expand (commit bb713d8)
