---
id: sc-rdrc
status: closed
deps: [sc-aobl]
links: []
created: 2026-03-29T12:53:21Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [vscode, field-lineage, phase-1, elk, webview]
---
# vscode: field-lineage webview renderer with ELK layout and design tokens

Create webview/field-lineage/field-lineage.ts and field-lineage.css. Use ELK.js (layered strategy, elk.direction=RIGHT) to position nodes: focal field in its own centre layer, upstream nodes in layers to its left, downstream nodes in layers to its right. Render field node cards matching the sz-schema-card visual language: orange header with schema name, monospace field row, via_mapping label in muted text below. SVG overlay for Bezier edges — port positions from ELK output, matching the approach in sz-edge-layer.ts. Edge colour by classification: structural=--sz-orange, nl=--sz-green, nl-derived=--sz-green at 60% opacity with dashed stroke, mixed=--sz-violet, none=--sz-text-muted. Apply --sz-* design tokens from tokens.css; inject dark/light variants based on isDark flag from panel. Click on non-focal card dispatches re-centre message. Click on field name dispatches navigate message.

## Acceptance Criteria

- ELK layered layout positions nodes correctly for 1, 3, and 5+ upstream nodes without overlap
- Focal field card is visually distinct (larger or highlighted border)
- Each node card shows: schema name in orange header, field name in monospace row, via_mapping in muted text
- Edges are colour-coded by classification matching the token spec
- NL-derived edges use dashed stroke
- Dark theme applies correctly when body.dark is set
- Clicking a non-focal card sends { type: 'recenter', fieldPath } message
- Clicking a field name (navigate target) sends { type: 'navigate', uri, line } message
- Breadcrumb trail rendered in panel toolbar with back navigation
- Empty state shows a clear message when upstream and downstream are both empty
- No layout thrash on re-centre (ELK re-runs cleanly on new data)


## Notes

**2026-03-29T13:11:21Z**

**2026-03-29**

Cause: Webview renderer needed for ELK-based field lineage panel — new file, no prior implementation.
Fix: Created field-lineage.ts (ELK layered/RIGHT graph, Bezier SVG edges, field cards, breadcrumb toolbar) and field-lineage.css (sz-* design tokens, dark theme, classification colour coding). Updated esbuild.js with elkjs alias pointing to satsuma-viz/node_modules/elkjs.
