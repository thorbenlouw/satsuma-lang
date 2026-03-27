---
id: f2v-ja41
status: open
deps: [f2v-iv1v]
links: []
created: 2026-03-27T07:13:30Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase5]
---
# Phase 5.6: Hover cross-highlighting in Mapping Detail view

Bidirectional hover highlighting in the mapping detail view. Hover a mapping table row highlights the source field(s) in left schema card(s) and target field in right card. Hover a field in a schema card highlights the matching table row(s) and connected field on the other side. Highlighting: bold name + colored bg. Non-highlighted fields dim to opacity 0.5.

## Acceptance Criteria

- Hover table row highlights source and target fields in schema cards
- Hover schema field highlights matching table rows and opposite field
- Highlighting is bidirectional and immediate
- Peach background for source highlights, light green for target
- Non-highlighted fields dim to ~50% opacity
- Highlight clears on mouse leave

