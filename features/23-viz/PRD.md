# Feature 23 — Mapping Visualization

> **Status: NOT STARTED**

## Goal

Ship a rich, interactive webview that renders the source-to-target mapping in the active `.stm` file as a visual diagram: schemas as cards with typed fields, curved Bezier connections between mapped fields, collapsible transforms, namespace grouping, and layered comment/note display. The rendering layer must be reusable outside VS Code so the same codebase can power a future standalone web editor.

## Problem

1. **Mapping files are hard to reason about visually.** A 200-line `.stm` file with three source schemas, one target, nested `each` blocks, and multi-source joins requires significant mental effort to picture the data flow. Users currently rely on the text editor alone or the basic workspace graph (which operates at schema level, not field level).
2. **No field-level connection view exists.** The existing field lineage tracer shows a single-field chain. There is no way to see *all* field mappings in a transform at once — the "wiring diagram" that makes mapping intent obvious at a glance.
3. **Comments, notes, and metadata are invisible in the graph view.** Warnings (`//!`), open questions (`//?`), governance metadata, and rich markdown notes are first-class Satsuma constructs but have no visual surface outside the text editor.
4. **Cross-file lineage requires CLI commands.** Exploring upstream sources or downstream consumers of a schema means switching to the terminal. A visual "expand" interaction would make platform-wide lineage explorable.

## Design Principles

1. **Card-and-wire metaphor.** Schemas are cards, fields are rows in cards, mappings are curved lines connecting field rows. This is the most intuitive model for source-to-target mapping and aligns with the mockup in `idea-for-layout.png`.
2. **Progressive disclosure.** Start with schemas and field connections. Transforms are collapsed (gear icon on the wire). Notes are collapsed (icon on the field/card). Lineage beyond the current file is expandable on demand. The user controls the complexity they see.
3. **Portable rendering layer.** The visualization is a standalone web component package (`@satsuma/viz`) that receives a JSON document model and renders it. The VS Code extension hosts it in a webview. A future web editor hosts the same component. No VS Code API dependencies leak into the renderer.
4. **Warm, polished aesthetic.** Follow the site design language — cream backgrounds, orange/green accents, Inter + JetBrains Mono typography, soft shadows, rounded cards. The visualization should feel like a premium product, not a debug tool.
5. **Lightweight bundle.** ELK.js for layout (~300KB WASM), Lit for rendering (~7KB), no framework overhead. Target total webview bundle under 500KB gzipped.

## Non-Goals

- **Editing mappings in the visual view.** This is read-only visualization. Bidirectional editing (drag a wire to create a mapping) is a separate future feature.
- **Replacing the workspace graph or field lineage tracer.** This complements them at a different zoom level: workspace graph = 30,000ft, mapping viz = single-file deep dive, field lineage = single-field trace.
- **Real-time collaborative editing.** The visualization reflects the current file state. Live multi-user cursors and conflict resolution are out of scope.
- **Print/export to PDF or image.** Useful but deferred to a later phase.
- **Custom layout or manual node positioning.** ELK handles layout automatically. Users can filter and collapse, but not drag nodes to arbitrary positions (this avoids persisting layout state).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  VS Code Extension (host)                                   │
│                                                             │
│  ┌──────────────┐    LSP custom request    ┌─────────────┐ │
│  │  Viz Panel    │◄───── vizModel ─────────│  LSP Server  │ │
│  │  (webview)    │    satsuma/vizModel      │  (server.ts) │ │
│  │              │                          │             │ │
│  │  ┌──────────┐│                          │  tree-sitter │ │
│  │  │@satsuma/ ││                          │  workspace   │ │
│  │  │viz       ││                          │  index       │ │
│  │  │(web comp)││                          └─────────────┘ │
│  │  └──────────┘│                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Future: Standalone Web Editor                              │
│                                                             │
│  ┌──────────────┐    REST / WebSocket      ┌─────────────┐ │
│  │  Web App      │◄───── vizModel ─────────│  API Server  │ │
│  │              │                          │  (same JSON) │ │
│  │  ┌──────────┐│                          └─────────────┘ │
│  │  │@satsuma/ ││                                          │
│  │  │viz       ││                                          │
│  │  │(web comp)││                                          │
│  │  └──────────┘│                                          │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**1. VizModel (JSON schema)**

A stable, serializable document model that describes everything the renderer needs. Produced by the LSP server (or any backend), consumed by the renderer. Decouples data extraction from presentation.

```typescript
interface VizModel {
  /** File URI this model was generated from */
  uri: string;
  /** Top-level file notes (project context) */
  fileNotes: NoteBlock[];
  /** Namespace groups (null namespace = global scope) */
  namespaces: NamespaceGroup[];
}

interface NamespaceGroup {
  name: string | null;
  schemas: SchemaCard[];
  mappings: MappingBlock[];
  metrics: MetricCard[];
  fragments: FragmentCard[];
}

interface SchemaCard {
  id: string;
  qualifiedId: string;          // namespace::name or bare name
  kind: "schema" | "inline";
  label: string | null;         // display label from quotes
  fields: FieldEntry[];
  notes: NoteBlock[];
  comments: CommentEntry[];
  metadata: MetadataEntry[];    // governance, format hints
  location: SourceLocation;
  /** true if this schema has upstream/downstream in other files */
  hasExternalLineage: boolean;
}

interface FieldEntry {
  name: string;
  type: string;                 // "STRING", "DECIMAL(14,2)", "record", "list_of record"
  constraints: string[];        // ["pk", "required", "pii"]
  notes: NoteBlock[];
  comments: CommentEntry[];
  children: FieldEntry[];       // nested record fields
  location: SourceLocation;
}

interface MappingBlock {
  id: string;
  sourceRefs: string[];         // qualified schema IDs
  targetRef: string;            // qualified schema ID
  arrows: ArrowEntry[];
  eachBlocks: EachBlock[];
  flattenBlocks: FlattenBlock[];
  sourceBlock: SourceBlockInfo | null;
  notes: NoteBlock[];
  comments: CommentEntry[];
  location: SourceLocation;
}

interface ArrowEntry {
  sourceFields: string[];       // ["first_name", "last_name"] for multi-source
  targetField: string;
  transform: TransformInfo | null;
  metadata: MetadataEntry[];    // (derived), (note "...")
  comments: CommentEntry[];
  location: SourceLocation;
}

interface TransformInfo {
  kind: "pipeline" | "nl" | "mixed" | "map";
  /** Raw text of the transform */
  text: string;
  /** Individual pipeline steps, if kind is pipeline or mixed */
  steps: string[];
  /** NL portion, if kind is nl or mixed */
  nlText: string | null;
}

interface EachBlock {
  sourceField: string;
  targetField: string;
  arrows: ArrowEntry[];
  nestedEach: EachBlock[];
  location: SourceLocation;
}

interface FlattenBlock {
  sourceField: string;
  arrows: ArrowEntry[];
  location: SourceLocation;
}

interface MetricCard {
  id: string;
  qualifiedId: string;
  label: string | null;
  source: string[];
  grain: string | null;
  slices: string[];
  filter: string | null;
  fields: MetricFieldEntry[];
  notes: NoteBlock[];
  comments: CommentEntry[];
  location: SourceLocation;
}

interface MetricFieldEntry {
  name: string;
  type: string;
  measure: "additive" | "non_additive" | "semi_additive" | null;
  notes: NoteBlock[];
  location: SourceLocation;
}

interface FragmentCard {
  id: string;
  fields: FieldEntry[];
  notes: NoteBlock[];
  location: SourceLocation;
}

interface NoteBlock {
  text: string;                 // raw markdown content
  isMultiline: boolean;
  location: SourceLocation;
}

interface CommentEntry {
  kind: "warning" | "question"; // //! or //?  (// are stripped)
  text: string;
  location: SourceLocation;
}

interface MetadataEntry {
  key: string;
  value: string;
}

interface SourceBlockInfo {
  schemas: string[];
  joinDescription: string | null;
  filters: string[];
}

interface SourceLocation {
  uri: string;
  line: number;
  character: number;
}
```

**2. LSP Server: `satsuma/vizModel` request**

A new custom LSP request handler in `server.ts`. Given a document URI, it walks the parse tree and workspace index to produce a `VizModel`. This reuses existing parser infrastructure — no new parsing needed.

**3. Renderer: `@satsuma/viz` web component**

A self-contained rendering package built with:

- **ELK.js** — Layered graph layout algorithm. Handles the hard problem of positioning schema cards in columns and routing edges between field ports without crossings. The WASM binary (~300KB) runs in the webview's web worker.
- **Lit** — Lightweight web component library (~7KB). Provides reactive rendering, shadow DOM encapsulation, and CSS scoping. Each card, field row, and edge is a Lit element.
- **Vanilla SVG** — Bezier curves for field connections, rendered in an SVG overlay layer positioned above the card DOM elements. This separates card layout (DOM/CSS) from wire routing (SVG).

The component accepts a `VizModel` via property and renders the full diagram. It dispatches custom events for host integration (navigate-to-source, expand-lineage).

```html
<!-- VS Code webview usage -->
<satsuma-viz .model=${vizModel} @navigate=${handleNavigate}></satsuma-viz>

<!-- Future standalone usage -->
<satsuma-viz .model=${vizModel} @navigate=${handleNavigate}></satsuma-viz>
```

**4. VS Code Panel: `VizPanel`**

Follows the existing singleton webview panel pattern (like `GraphPanel` and `LineagePanel`). Listens for active editor changes, requests the `VizModel` from the LSP server, and posts it to the webview. Handles navigation messages (open file at line) and lineage expansion requests.

### Visual Design

**Color Palette** (from site design tokens):

| Element | Color | Token |
|---------|-------|-------|
| Background | `#FFFAF5` | cream |
| Card background | `#FFFFFF` | white |
| Card border | `rgba(45,42,38,0.08)` | charcoal/8 |
| Card shadow | `0 2px 8px rgba(45,42,38,0.06)` | — |
| Schema header | `#F2913D` | orange |
| Metric header | `#8E5BB0` | violet |
| Fragment header | `#5A9E6F` | green |
| Field text | `#2D2A26` | charcoal |
| Type text | `#6B6560` | warm-gray |
| Constraint badge | `#FFF3E8` bg, `#D97726` text | peach/orange-dark |
| Arrow stroke | `#D97726` | orange-dark |
| Arrow (NL) stroke | `#5A9E6F` | green |
| Namespace box | `#FFF3E8` bg, dashed `#F5E6D3` border | peach/code-border |
| Warning badge (`//!`) | `#FEF3CD` bg, `#C45D22` icon | amber |
| Question badge (`//?`) | `#E8F0FE` bg, `#7C6BAE` icon | blue/violet |
| Gear icon (transform) | `#6B6560` | warm-gray |
| PII shield icon | `#C45D22` | warning |

**Typography:**

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Schema name | Inter | 14px | 600 (semibold) |
| Field name | JetBrains Mono | 12px | 500 (medium) |
| Field type | JetBrains Mono | 11px | 400 (regular) |
| Constraint badge | Inter | 10px | 500 |
| Transform text | JetBrains Mono | 11px | 400 |
| NL transform | Inter | 11px | 400 italic |
| Note content | Inter | 12px | 400 |
| Namespace label | Inter | 11px | 600 uppercase |

**Card Anatomy:**

```
┌─────────────────────────────────┐
│ ■ crm_customers          4/6 ▾ │  ← header: icon, name, mapped/total, collapse
│ CRM system customer data        │  ← label (if present), muted
├─────────────────────────────────┤
│ ● customer_id  UUID    pk req  │  ← field: port dot, name, type, constraint badges
│ ● email        STRING  pii ⚠  │  ← pii shield + //! warning badge
│ ● first_name   STRING         │
│ ● last_name    STRING         │
│ ○ phone        VARCHAR(20)    │  ← hollow dot = unmapped field
│ ○ loyalty_pts  INT            │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ 📝 Note                    ▸  │  ← collapsed note indicator
└─────────────────────────────────┘
```

- Filled dot (●) = field is mapped (connected by an arrow)
- Hollow dot (○) = field is unmapped
- Port dots are the anchor points for Bezier curves
- Header shows `mapped/total` field count as a subtle coverage indicator
- Constraint badges render as small pills: `pk` `req` `pii` `idx`

**Metric Card Anatomy:**

```
╭─────────────────────────────────╮
│ ◆ monthly_recurring_revenue     │  ← diamond icon, violet header
│   "MRR"  ·  grain: monthly      │  ← label, grain
│   slice: segment, product, rgn  │  ← slice dimensions
├─────────────────────────────────┤
│ Σ value        DECIMAL(14,2)    │  ← Σ = additive measure
│ Σ order_count  INTEGER          │
│ ≈ avg_value    DECIMAL(10,2)    │  ← ≈ = non-additive
╰─────────────────────────────────╯
```

- Rounded top/bottom edges (border-radius on all corners)
- Violet accent (`#8E5BB0`) instead of orange
- Measure icons: `Σ` additive, `≈` non-additive, `½` semi-additive
- No outgoing port dots (metrics are terminal sinks)

**Wire Anatomy:**

```
 source card          target card
 ┌────────┐          ┌────────┐
 │ ● field ├──╮  ╭──►│ ● field│
 │ ● field ├──┤  │   │        │
 └────────┘  │  │   └────────┘
              ╰──⚙──╯
                 │
           [click to expand]
              trim | lower
```

- Curved Bezier paths from source port dot to target port dot
- Multi-source arrows converge at a merge point before the target
- Transform gear icon (⚙) sits at the midpoint of the curve
- Click gear to expand: shows pipeline steps or NL text in a floating card
- NL transforms render in green with italic text
- Pipeline transforms render in monospace with `|` separators

**Namespace Grouping:**

```
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
╎  POS                          ╎
╎  ┌──────────┐  ┌────────────┐ ╎
╎  │ stores    │  │ terminals  │ ╎
╎  └──────────┘  └────────────┘ ╎
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
```

- Dashed border, peach background
- Uppercase namespace label in top-left
- Schemas within a namespace are grouped inside the box
- Cross-namespace arrows pass through the box boundaries
- ELK handles hierarchical grouping natively (compound nodes)

**Comment Display:**

| Type | Icon | Behavior |
|------|------|----------|
| `//!` Warning | ⚠ amber triangle | Badge on field row or card header. Hover shows full text. |
| `//?` Question | ? blue circle | Badge on field row or card header. Hover shows full text. |
| `//` Author | (not shown) | Stripped per spec — not rendered in viz. |

Comments attach to the nearest field or block they annotate (determined by source location — the comment's line relative to the construct it precedes or follows).

**Project-Level Notes Pane:**

A collapsible right-side pane that renders file-level `note { }` blocks as markdown. Uses the same cream/white card styling. Collapsed by default if no file-level notes exist.

### Toolbar

```
┌──────────────────────────────────────────────────────────────────┐
│  ◉ Mapping Viz  │  Schema Only  │  Show Notes  │  Fit  │  ⟳   │
└──────────────────────────────────────────────────────────────────┘
```

| Control | Behavior |
|---------|----------|
| **Schema Only** toggle | Hides all arrows and transforms, shows only schema cards with field lists. Useful for reviewing structure without mapping noise. |
| **Show Notes** toggle | Shows/hides the notes pane and inline note indicators. |
| **Fit** button | Resets zoom/pan to fit all content in the viewport. |
| **⟳ Refresh** button | Re-fetches the VizModel from the LSP server. |
| **Namespace filter** dropdown | (appears when namespaces exist) Filter to a single namespace or show all. |

### Interactions

| Interaction | Behavior |
|-------------|----------|
| **Click schema header** | Navigate to schema definition in editor |
| **Click field row** | Navigate to field definition in editor |
| **Click arrow/wire** | Navigate to the arrow definition in the mapping block |
| **Click gear icon** | Expand/collapse transform detail card |
| **Hover field** | Tooltip with full type, constraints, and note preview |
| **Hover wire** | Tooltip with transform summary |
| **Hover badge** | Tooltip with full `//!` or `//?` comment text |
| **Click expand (◂/▸) on schema** | Load upstream/downstream schemas from other files (Phase 2) |
| **Scroll** | Pan the viewport |
| **Pinch/Ctrl+scroll** | Zoom |
| **Click note indicator** | Expand note inline with rendered markdown |

## Phased Delivery

### Phase 1 — Core Visualization (MVP)

Render a single `.stm` file as an interactive card-and-wire diagram.

**1.1 VizModel + LSP request**
- [ ] Define `VizModel` TypeScript interfaces in a shared types package
- [ ] Implement `satsuma/vizModel` custom LSP request handler
- [ ] Walk parse tree to extract schemas, fields, mappings, arrows, transforms
- [ ] Extract notes, `//!` warnings, `//?` questions with source locations
- [ ] Extract metric blocks with measure annotations
- [ ] Handle fragments (rendered as green-accented cards)
- [ ] Handle namespace grouping
- [ ] Unit tests: VizModel generation for each example in `examples/`

**1.2 Renderer — schema cards**
- [ ] Set up `@satsuma/viz` package with Lit + esbuild
- [ ] Implement `<satsuma-viz>` root web component
- [ ] Implement `<sz-schema-card>` — header, field list, port dots, constraint badges
- [ ] Implement `<sz-metric-card>` — violet accent, measure icons, metadata display
- [ ] Implement `<sz-fragment-card>` — green accent, spread indicator
- [ ] Implement field coverage indicators (filled/hollow dots, mapped/total count)
- [ ] Implement collapse/expand on cards
- [ ] Apply site design tokens (colors, typography, shadows, radii)
- [ ] Dark theme support (respect VS Code theme kind)

**1.3 Renderer — layout + wiring**
- [ ] Integrate ELK.js for layered layout (sources left, targets right, metrics far right)
- [ ] Configure ELK port constraints (field rows as ports)
- [ ] Implement SVG overlay layer for Bezier edge rendering
- [ ] Implement edge routing: single-source, multi-source merge, computed (no source)
- [ ] Implement gear icon at edge midpoint with expand/collapse
- [ ] Implement transform detail card (pipeline steps, NL text, map blocks)
- [ ] Distinguish NL arrows (green, italic) from pipeline arrows (orange, monospace)
- [ ] Implement namespace compound boxes (dashed border, peach fill, label)

**1.4 Renderer — annotations**
- [ ] Implement `//!` warning badges on fields and cards
- [ ] Implement `//?` question badges on fields and cards
- [ ] Implement hover tooltips for badges, fields, and wires
- [ ] Implement collapsible inline notes with markdown rendering (use a tiny markdown-to-HTML lib or `marked` with tree-shaking)
- [ ] Implement PII shield icon on fields with `pii` constraint

**1.5 VS Code integration**
- [ ] Implement `VizPanel` (singleton webview panel pattern)
- [ ] Add `Satsuma: Show Mapping Visualization` command
- [ ] Add editor title button (eye icon) for `.stm` files — opens viz beside editor
- [ ] Wire LSP request → webview postMessage flow
- [ ] Wire click-to-navigate from webview back to editor
- [ ] Auto-refresh on file save
- [ ] Respect VS Code color theme (light/dark detection)
- [ ] Content Security Policy (nonce-restricted scripts, scoped styles)

**1.6 Toolbar + filtering**
- [ ] Implement toolbar with Schema Only toggle
- [ ] Implement Show Notes toggle
- [ ] Implement Fit-to-viewport button
- [ ] Implement Refresh button
- [ ] Implement namespace filter dropdown (when namespaces present)
- [ ] Implement zoom/pan (CSS transform on container, wheel events)

### Phase 2 — Cross-File Lineage Expansion

- [ ] Add expand buttons (◂ upstream / ▸ downstream) on schemas with `hasExternalLineage`
- [ ] On expand: request VizModel for the linked file, merge into the current layout
- [ ] Animate the expansion (new cards slide in from left/right)
- [ ] Track expansion depth, allow collapse back to single-file view
- [ ] Add breadcrumb trail showing expansion path

### Phase 3 — Project Notes Pane + Comment Arrows

- [ ] Implement collapsible right-side notes pane for file-level notes
- [ ] Render notes as styled markdown cards
- [ ] Implement comment arrows: `//!` and `//?` comments that apply to a block (not a field) rendered as floating badges with thin leader lines to their target
- [ ] Group comments by severity in the notes pane (warnings first, then questions)

### Phase 4 — Advanced Features

- [ ] `each` block visualization: nested box within the mapping area showing iteration scope
- [ ] `flatten` block visualization: unnest icon and scope indicator
- [ ] Source block visualization: join descriptions, multi-source indicators
- [ ] Filter expression display on source schemas
- [ ] Fragment spread indicators (dotted outline showing inlined fields)
- [ ] Minimap for large diagrams
- [ ] Export to SVG/PNG (headless render of current view)

## Success Criteria

1. **Correctness.** The VizModel faithfully represents every construct in `examples/*.stm`. All field mappings, transforms, notes, comments, and metadata are present and correctly associated.
2. **Visual fidelity.** The rendering matches the site design language. Cards, colors, typography, and spacing are consistent with the brand. A designer reviewing the output would recognize it as the same product family.
3. **Performance.** Files with up to 20 schemas and 200 fields render in under 500ms. Layout computation (ELK) runs in a web worker and does not block the UI thread.
4. **Portability.** The `@satsuma/viz` package has zero VS Code dependencies. It can be imported into a plain HTML page with `<script type="module">` and rendered with a JSON model.
5. **Bundle size.** The webview bundle (renderer + ELK WASM + Lit) is under 500KB gzipped.
6. **Test coverage.** VizModel generation has unit tests for every example file. Renderer has snapshot tests for card rendering and edge routing.
7. **Accessibility.** Cards and fields have ARIA labels. Keyboard navigation supports tab-through-cards and Enter to navigate to source. Color is not the sole differentiator (icons accompany all colored badges).

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| ELK.js layout produces poor results for heavily connected graphs | Cards overlap or wires cross excessively | Tune ELK options (layered algorithm, port constraints, spacing). Fall back to simple column layout for very dense files. |
| WASM loading fails in restricted VS Code webview environments | Viz panel shows blank | Bundle ELK as pure JS fallback (slower but functional). Detect WASM support on init. |
| VizModel schema drifts from parse tree as grammar evolves | Stale or missing constructs in visualization | VizModel generation tests run against all example files. Grammar changes that break VizModel tests are caught in CI. |
| Bundle size exceeds budget | Extension becomes sluggish to install/load | Tree-shake aggressively. Lazy-load ELK WASM only when viz panel opens. Monitor bundle size in CI. |
| Dark theme contrast issues | Unreadable text or invisible wires in dark themes | Define a full dark palette. Test with VS Code Dark+, Monokai, and Solarized Dark. Use CSS custom properties for all colors. |
| Markdown rendering in notes introduces XSS vector | Malicious `.stm` files could inject scripts via notes | Sanitize markdown output. Use a renderer that produces safe HTML (no raw HTML passthrough). CSP blocks inline scripts. |

## Dependencies

- **Tree-sitter grammar** — VizModel extraction walks the CST. Grammar must be stable for the constructs being visualized.
- **LSP server workspace index** — Provides cross-file symbol resolution for `hasExternalLineage` detection (Phase 2).
- **Site design tokens** — Colors and typography from `site/css/custom.css`. If the site palette changes, the viz palette should update to match.

## File Locations

| Artifact | Path |
|----------|------|
| PRD | `features/23-viz/PRD.md` |
| Layout mockup | `features/23-viz/idea-for-layout.png` |
| Viz renderer package | `tooling/satsuma-viz/` (new) |
| Viz web component entry | `tooling/satsuma-viz/src/satsuma-viz.ts` |
| VizModel types | `tooling/satsuma-viz/src/model.ts` |
| ELK layout module | `tooling/satsuma-viz/src/layout/elk-layout.ts` |
| Card components | `tooling/satsuma-viz/src/components/` |
| Edge renderer | `tooling/satsuma-viz/src/edges/` |
| Design tokens (CSS) | `tooling/satsuma-viz/src/tokens.css` |
| LSP VizModel handler | `tooling/vscode-satsuma/server/src/viz-model.ts` |
| VS Code VizPanel | `tooling/vscode-satsuma/src/webview/viz/panel.ts` |
| Webview HTML shell | `tooling/vscode-satsuma/src/webview/viz/viz.html` |
| VizModel tests | `tooling/vscode-satsuma/server/test/viz-model.test.ts` |
| Renderer tests | `tooling/satsuma-viz/test/` |
