# ADR-012 — ELK.js + Lit Web Components for Mapping Visualization

**Status:** Accepted
**Date:** 2026-03 (retrospective, PR #115)

## Context

Feature 23 required an interactive visualization of Satsuma mapping files — showing schema cards with field-level ports, arrows between fields, and a two-level view (overview of all schemas, detail of a single mapping). This visualization runs inside a VS Code webview panel.

The key decisions were:

1. **Layout engine** — how to compute positions for schema cards and route edges between field-level ports.
2. **Rendering framework** — how to build the interactive UI inside a webview.

Alternatives considered for layout:
- **D3-force** — physics-based layout; good for organic graphs but poor at preserving field-level port alignment in structured diagrams.
- **Dagre** — layered layout for DAGs; no native support for port constraints (field-level edge attachment points).
- **ELK.js** — Eclipse Layout Kernel compiled to JavaScript; supports layered layout with explicit port definitions, hierarchical grouping, and configurable spacing.

Alternatives considered for rendering:
- **React** — dominant framework, but heavy for a webview that needs to be bundled into a VS Code extension.
- **Vanilla DOM** — no build step, but manual DOM management becomes unwieldy for interactive cards with hover states, animations, and dynamic data binding.
- **Lit** — lightweight web components library (~5 KB); reactive properties, shadow DOM encapsulation, no virtual DOM overhead. Already standards-based (Custom Elements v1).

## Decision

Use ELK.js for graph layout and Lit web components for the rendering layer.

The visualization lives in `tooling/satsuma-viz/` as the `@satsuma/viz` package. Components include `SatsumaViz` (root), `SzSchemaCard`, `SzMetricCard`, `SzFragmentCard`, `SzMappingDetail`, `SzEdgeLayer`, and `SzOverviewEdgeLayer`. The VS Code extension hosts these via a `VizPanel` webview that passes data from the LSP server.

ELK computes layout with explicit port definitions (one port per field row on each schema card), so edges attach precisely to the correct field. The `preambleHeight()` function accounts for label and metadata-pill sections so ELK port positions match rendered card geometry exactly.

The protocol contract between the LSP server (which produces the data) and the viz components (which render it) is defined in `@satsuma/viz-model` (see ADR-017).

## Consequences

**Positive:**
- ELK's port-aware layout produces clean, professional diagrams with field-level edge routing — no manual positioning needed
- Lit components are small, fast, and encapsulated — the entire viz bundle adds minimal weight to the VSIX
- Web components are framework-agnostic — the viz could be reused outside VS Code (e.g., in the project site or a standalone viewer)
- Two-level view (overview ↔ mapping detail) with animated transitions gives users both high-level and detailed perspectives

**Negative:**
- ELK.js is a large dependency (~1.5 MB) — contributes meaningfully to VSIX size
- ELK layout computation is synchronous and CPU-bound — very large workspaces could cause perceptible delay
- Lit is less widely known than React — contributors may need to learn its reactive property model
- Field-level port alignment requires careful coordination between ELK port positions and CSS-rendered card geometry (`preambleHeight()`)
