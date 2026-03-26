---
id: f2v-46cn
status: closed
deps: []
links: []
created: 2026-03-26T22:35:49Z
type: task
priority: 1
assignee: Thorben Louw
---
# Integrate ELK.js layout and SVG edge rendering

Phase 1.3 of Feature 23. Add:
- ELK.js for layered graph layout (sources left, targets right, metrics far right)
- ELK port constraints (field rows as ports)
- SVG overlay layer for Bezier edge rendering
- Edge routing: single-source, multi-source merge, computed (no source)
- Gear icon at edge midpoint with expand/collapse for transform detail
- Transform detail card (pipeline steps, NL text)
- Distinguish NL arrows (green, italic) from pipeline arrows (orange, monospace)
- Namespace compound boxes (dashed border, peach fill, label)

Acceptance:
- Layout positions source schemas left, targets right
- Bezier curves connect mapped field port dots
- Transform gear icon appears at edge midpoint
- Click gear expands transform detail
- NL vs pipeline arrows visually distinguished
- Tests for layout and edge rendering


## Notes

**2026-03-26T22:44:21Z**

## Notes

**2026-03-26T19:30:00Z**

Cause: Phase 1.3 — need graph layout and edge rendering for mapping visualization.
Fix: Added ELK.js layered layout engine (elk-layout.ts) with port-constrained
field positions, SVG Bezier edge layer (sz-edge-layer.ts) with transform gear
icons and expandable transform detail cards, namespace compound boxes. Root
<satsuma-viz> now uses ELK positioning with flex fallback. Bundle 445KB gzipped
(under 500KB budget). 16 tests passing.
