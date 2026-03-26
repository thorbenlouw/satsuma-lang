---
id: f2v-2wac
status: open
deps: []
links: [f2v-cd0p]
created: 2026-03-26T23:15:21Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase3]
---
# Phase 3: Block-level comment arrows with floating badges

Render //! and //? comments that apply to a block (not a specific field) as floating badges with thin leader lines pointing to their target block. Position badges outside the card with a line connecting to the relevant card header.

## Acceptance Criteria

- Block-level warning comments render as floating amber badges
- Block-level question comments render as floating blue badges
- Thin leader lines connect badges to their target card
- Badges show full text on hover
- Badges do not overlap with cards or edges

