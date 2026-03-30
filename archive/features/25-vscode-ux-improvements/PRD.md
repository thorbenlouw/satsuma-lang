# Feature 25 — VS Code UX Improvements: Field Lineage Redesign + Command Cleanup

> **Status: DRAFT — awaiting review**

---

## Goal

Overhaul the VS Code extension's field-level lineage experience to use the new `field-lineage` CLI command, render as a proper visual DAG (matching the viz panel's colour language and design quality), launch from a single right-click without an input box, and eliminate the confusion between overlapping commands. Also clean up the extension's overall command surface so each entry point has a distinct, well-understood purpose.

---

## Problem

### 1. The current field lineage view is ugly and broken

`satsuma.traceFieldLineage` / `LineagePanel` has fundamental issues:

- **Wrong data source.** It drives the view by looping over `satsuma arrows --as-source` calls, one hop at a time. It predates the `field-lineage` subcommand (added in e168613) and has never been updated to use it.
- **Downstream only.** The multi-hop loop follows arrow targets forward. There is no upstream tracing at all. The `--upstream` / `--downstream` flags on the new command are completely unexploited.
- **Silently misses anonymous mappings.** The `arrows` command's JSON output contains `mapping: null` for arrows inside anonymous `mapping { … }` blocks. The old loop treats those edges as unresolvable and drops them. (This was the root cause of sl-m44v/sl-riw5, now fixed in the CLI itself, but the webview's accumulation loop was the original reporter.)
- **Misses NL-derived edges.** `arrows` with `--as-source` returns declared arrows only. NL `@ref` implicit lineage (nl-derived classification) is never included.
- **Flat linear chain layout.** The webview renders a single horizontal `flex` row: `[node] → [node] → [node]`. Any branching (a field fed by two sources, or feeding two targets) silently drops all but the first path through `buildChain()`'s source-wins heuristic.
- **Requires a manual input box.** Even when the cursor is positioned on a field name, `traceFieldLineage` still shows `vscode.window.showInputBox` with only a pre-filled default. The user must confirm or edit before anything happens.
- **No visual coherence with the viz panel.** The lineage CSS (blue `#569cd6` borders, dark `#333` labels) looks nothing like the viz component's warm orange/green palette. A user who switches between the two panels is looking at two completely different design languages.

### 2. The command surface is confusing

The extension registers eight Satsuma commands. Three of them (`showLineage`, `showArrows`, `traceFieldLineage`) all surface some form of lineage/arrow data, but with different granularities and interfaces that are not obviously related:

| Command | What it does | Interface |
|---|---|---|
| `satsuma.showLineage` | Schema-level DAG from/to a chosen schema | Output channel (text) |
| `satsuma.showArrows` | Direct arrows for a typed `schema.field` | Output channel (text) |
| `satsuma.traceFieldLineage` | Multi-hop downstream chain for a typed field | Webview (basic) |

A new user has no clear mental model for when to use which. `showArrows` is strictly a subset of `traceFieldLineage`. `showLineage` and `traceFieldLineage` operate at different levels but share no visual language.

### 3. The viz panel and field lineage are disconnected

When a user is looking at a mapping in the viz panel and wants to understand where a specific field came from or flows to, there is no interaction path. They must switch back to the text editor, position the cursor on the field name, and manually invoke `traceFieldLineage`. There is no "trace this field" affordance on a field row inside a viz schema card.

---

## Success Criteria

1. Right-clicking on any field name (in a declaration or an arrow) opens the field lineage panel immediately — no input box — with both upstream and downstream populated.
2. The lineage panel renders as a three-column DAG (upstream | focal field | downstream) with SVG Bezier edges, using the same design tokens (`--sz-*`) and colour palette as `@satsuma/viz`.
3. Edges are colour-coded by classification: structural = orange (`--sz-orange`), NL = green (`--sz-green`), nl-derived = muted green, mixed = violet (`--sz-violet`).
4. Clicking any non-focal field in the panel re-centres the view on that field (runs a new `field-lineage` query without reopening the panel).
5. The via_mapping label is visible on each edge (shown on hover or always, below the edge).
6. `satsuma.showArrows` is removed from the command palette and context menus (it is fully superseded).
7. `satsuma.showLineage` is moved to the command palette only (no context menu entry) and retains its schema-level text output for now.
8. A "Trace Field Lineage" action appears on field rows inside the viz panel when hovered.
9. The panel title updates when re-centring, and a breadcrumb trail records the navigation history so the user can go back.
10. All changes follow the existing project engineering expectations (parser-backed, no regex hacks, full test coverage of CLI integration points).

---

## Design

### 3-Column DAG Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  ⟵  [Breadcrumb: raw.amount > orders.amount]        ⟳ Refresh  [×]   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  UPSTREAM (3)          FOCAL FIELD          DOWNSTREAM (1)             │
│                                                                         │
│  ┌─────────────┐                            ┌─────────────┐            │
│  │ raw         │                            │ invoices    │            │
│  │ amount   ───┼──────────────────────────→ │ total    ───┼→ ...       │
│  └─────────────┘         ┌──────────┐       └─────────────┘            │
│                          │ orders   │                                   │
│  ┌─────────────┐         │ amount   │                                   │
│  │ legacy      │ ──────→ │ [FOCAL]  │                                   │
│  │ cost     ───┼──────→  └──────────┘                                   │
│  └─────────────┘                                                        │
│                                                                         │
│  ┌─────────────┐                                                        │
│  │ source      │                                                        │
│  │ amount   ───┼──────────────────────────→                             │
│  └─────────────┘                                                        │
│                                                                         │
│  Depth: [────●────] 3    Filter: [all ▾]                               │
└────────────────────────────────────────────────────────────────────────┘
```

**Layout rules:**
- ELK.js drives node placement using a `layered` strategy with `elk.direction: RIGHT`. The focal field is assigned to a fixed centre layer; upstream nodes are placed in layers to its left; downstream nodes in layers to its right.
- ELK handles the crowded case automatically — 5+ upstream sources stack without manual coordinate arithmetic.
- All edges are rendered as SVG Bezier curves in an overlay `<svg>` that spans the full panel. Port positions come from ELK's output directly, matching how `sz-edge-layer.ts` works in the viz component.
- The focal field card uses a slightly larger size and a highlighted border to make it visually dominant.
- If a node at the edge of the graph has further connections beyond the current depth, a small "→ …" pill affordance on the card indicates more; clicking it re-centres on that field.

### Design Tokens

The panel's webview uses the same `--sz-*` token set as `@satsuma/viz`. The panel injects a `<style>` block that re-declares these tokens from the VS Code theme:

```css
/* Light theme */
:root {
  --sz-bg: #FFFAF5;
  --sz-card-bg: #FFFFFF;
  --sz-card-border: rgba(45, 42, 38, 0.08);
  --sz-card-shadow: 0 2px 8px rgba(45, 42, 38, 0.06);
  --sz-orange: #F2913D;
  --sz-green: #5A9E6F;
  --sz-violet: #8E5BB0;
  --sz-text: #2D2A26;
  --sz-text-muted: #6B6560;
  --sz-arrow-stroke: #D97726;
  --sz-arrow-nl-stroke: #5A9E6F;
  --sz-font-sans: "Inter", system-ui, sans-serif;
  --sz-font-mono: "JetBrains Mono", ui-monospace, monospace;
  --sz-card-radius: 8px;
  --sz-field-height: 28px;
}

/* Dark theme (applied when extension host sends isDark=true) */
body.dark { ... }
```

**Classification → edge colour mapping:**

| Classification | Stroke colour | Label badge style |
|---|---|---|
| `structural` | `--sz-arrow-stroke` (orange) | plain |
| `nl` | `--sz-arrow-nl-stroke` (green) | green pill |
| `nl-derived` | `--sz-arrow-nl-stroke` at 60% opacity | dashed stroke, "NL" prefix |
| `mixed` | `--sz-violet` | violet pill |
| `none` | `--sz-text-muted` | plain muted |

### Field Node Card

Each upstream/downstream node is a mini schema card, matching the visual language of `sz-schema-card`:

```
┌──────────────────────┐
│  orders       ← orange header, schema name
├──────────────────────┤
│  ● amount            ← field name row, monospace
│  via: load_orders    ← via_mapping label, muted
└──────────────────────┘
```

- Orange header contains the schema name (stripped of `::` prefix).
- Field row contains the field name in monospace.
- `via_mapping` label in muted text below the field name (always visible, not hover-only, because it's the primary reason this node appears).
- Hover highlights the card with a subtle border change and shows the full canonical field path as a tooltip.
- Click navigates to the field's source in the editor (using the `navigate` message to the extension host).
- For upstream nodes: a small left-facing chevron in the card triggers re-centring on that field.
- For downstream nodes: same with a right-facing chevron.

### Right-Click Entry Point

**Current behaviour:** `traceFieldLineage` appears in the context menu for all `.stm` files and requires an input box.

**New behaviour:**
1. The `when` clause is tightened to `editorLangId == satsuma && satsuma.cursorOnField` — a context key set by the LSP whenever the cursor is on a field identifier (declaration or reference in an arrow).
2. The label changes from `"Satsuma: Trace Field Lineage"` to `"Trace Field Lineage"` (no prefix when it's already in the Satsuma group).
3. The action directly invokes `LineagePanel.createOrShow` without an input box — the field path is resolved via `getEditorActionContext()` (`satsuma/actionContext` LSP request), which already returns `fieldPath`.
4. If `actionContext.fieldPath` is null (cursor not on a recognisable field), the command is hidden from the context menu via the `when` clause, so the user never sees a broken state.

Setting the `satsuma.cursorOnField` context key requires the LSP server to notify the extension host when the cursor moves onto a field identifier. This can be done with a `textDocument/didChange`-adjacent `satsuma/cursorContext` notification, or simply by attempting the `actionContext` request and setting the key asynchronously. The simpler approach (attempt + set) is sufficient for Phase 1.

### Viz Panel Integration

In `sz-schema-card.ts`, field rows already emit `SzFieldHoverEvent` on mouseover. A new interaction is added:

- On field row hover, a small lineage icon (🔗 or a custom SVG) appears at the right edge of the field row.
- Clicking it dispatches a `sz-field-lineage` custom event with `{ fieldPath, schemaId }`.
- `viz.ts` (the webview entry point) listens and posts `{ type: "traceFieldLineage", fieldPath }` to the extension host.
- `panel.ts` (the viz panel) handles this message by calling `vscode.commands.executeCommand("satsuma.traceFieldLineage", { fieldPath })`.

This gives users a direct "zoom into this field's lineage" affordance from inside the visual mapping view.

---

## Phase Plan

### Phase 1 — Core lineage panel replacement

**Scope:** Replace the existing `LineagePanel` implementation with the new DAG-based one backed by `field-lineage`. Remove the input box. ELK.js-positioned layout with SVG Bezier edges.

**Deliverables:**
- New `webview/field-lineage/panel.ts` — replaces `webview/lineage/panel.ts`. Calls `satsuma field-lineage <schema.field> <workspacePath> --json --depth <n>` via `runCli`. Sends `{ type: "fieldLineageData", payload: { field, upstream, downstream } }` to the webview.
- New `webview/field-lineage/field-lineage.ts` — webview renderer. Three-column layout. SVG overlay for Bezier edges. Classification colour coding. Click-to-navigate. Re-centring on click.
- New `webview/field-lineage/field-lineage.css` — design tokens, card styles, edge overlay.
- Updated `extension.ts` — `satsuma.traceFieldLineage` no longer shows an input box. Uses `actionContext.fieldPath` directly. If null, falls back to a quickpick of schema.field strings (for keyboard-driven use from command palette).
- Updated `package.json` — tighten `when` clause for context menu entry. No other command changes in Phase 1.
- Old `webview/lineage/` directory retained for reference until Phase 2 ships — do not delete yet.

**Acceptance tests:**
- Right-clicking a field name opens the panel with upstream and downstream both populated.
- Anonymous mapping lineage is traced (verifies the sl-m44v/sl-riw5 fix flows through to the UI).
- NL-derived edges appear with the correct classification colour.
- Clicking a non-focal field card re-centres the view on that field without reopening the panel.
- The breadcrumb trail updates with each re-centring.
- The panel title reflects the current focal field.
- Navigating to source (clicking the field name, not the chevron) opens the file at the correct line.
- Dark theme is applied correctly when `isDark` is true.

### Phase 2 — Command cleanup + viz integration

**Scope:** Remove `showArrows`. Add field lineage action to viz schema card field rows. Tighten context menu `when` clauses. Update `satsuma.showCoverage` to use the LSP `actionContext` (it currently uses a regex to find the mapping name — fragile).

**Deliverables:**
- Remove `commands/arrows.ts` and all registrations.
- Remove `"satsuma.showArrows"` from `package.json` (`commands`, `menus`).
- In `sz-schema-card.ts`: add lineage icon affordance on field row hover.
- In `viz.ts`: handle `sz-field-lineage` event.
- In `viz/panel.ts`: handle `traceFieldLineage` message from webview.
- Update `commands/coverage.ts` to use `client.sendRequest("satsuma/actionContext")` instead of regex parsing for `mappingName`.
- Update `commands/lineage.ts` to use `satsuma/actionContext` for the schema pre-selection.

**Acceptance tests:**
- `showArrows` no longer appears in command palette or context menus.
- Hovering a field row in the viz panel reveals the lineage icon.
- Clicking the lineage icon in the viz panel opens the field lineage panel for that field.
- Coverage command works correctly without regex-based mapping name extraction.

### Phase 3 — Depth/filter controls + schema lineage upgrade

**Scope:** Add interactive depth and classification filter controls to the field lineage panel. Upgrade `showLineage` from output channel to a simple webview showing a schema DAG.

**Deliverables:**
- Depth slider (1–10) in the field lineage panel toolbar. Changing it re-runs the CLI query.
- Classification filter dropdown: All / Structural only / NL only / Structural + NL-derived. Filters already-loaded edges without re-running the CLI.
- New `webview/schema-lineage/` — a simple DAG view for `satsuma lineage --from / --to` results, replacing the output channel. Nodes are schema name pills with namespace badges; edges are directed with mapping name labels.
- `satsuma.showLineage` updated to use the new webview panel.

---

## Command Surface After This Feature

| Command | Entry point | Interface | When visible |
|---|---|---|---|
| `satsuma.validateWorkspace` | Command palette | Status bar / output channel | Always |
| `satsuma.showLineage` | Command palette only | Webview (schema DAG) | `.stm` file open |
| `satsuma.whereUsed` | Context menu + palette | VS Code reference viewer | Cursor on identifier |
| `satsuma.traceFieldLineage` | **Context menu** (primary) + palette | **Webview (field DAG)** | **Cursor on field** |
| `satsuma.showCoverage` | Context menu + palette | Gutter decorations | Cursor in mapping |
| `satsuma.showWarnings` | Command palette | Output channel | `.stm` file open |
| `satsuma.showSummary` | Command palette | Output channel | `.stm` file open |
| `satsuma.showViz` | Editor title bar + context menu | Webview (mapping viz) | `.stm` file open |
| ~~`satsuma.showArrows`~~ | ~~removed~~ | ~~output channel~~ | ~~removed~~ |

---

## Risks & Notes

- **Layout with ELK:** Use ELK.js for node placement — it is already a transitive dependency in the workspace via `satsuma-viz` and produces correct hierarchical layouts for DAGs with many upstream nodes. Configure a left-to-right `layered` layout (`elk.direction: RIGHT`) with the focal field pinned to its own layer. This handles the crowded case (5+ upstream nodes) without extra effort and keeps the rendering architecture consistent with the viz component.
- **`field-lineage` path argument:** The CLI `field-lineage` command takes an optional `[path]` argument for the workspace root. The extension should pass the workspace folder root (`vscode.workspace.workspaceFolders[0].uri.fsPath`), not the file path, so multi-file lineage is traversed correctly.
- **Namespace stripping in field paths:** The `field-lineage` command accepts `ns::schema.field` notation. The LSP `actionContext.fieldPath` currently returns unqualified `schema.field`. Verify the LSP returns the namespace-qualified form where available; if not, that is a separate LSP improvement.
- **Removing `showArrows` in Phase 2:** Verify no keybinding, task, or other extension depends on `satsuma.showArrows` before removing it. Check `.keybindings.json` and any launch configurations.
- **Old `webview/lineage/` directory:** Do not delete in Phase 1. Delete as part of the Phase 2 PR once the new panel is confirmed stable. Include a `## Notes` entry in the relevant tickets.
- **`satsuma.cursorOnField` context key:** Phase 1 can use a polling approach (set the key asynchronously after a short debounce on cursor movement). Phase 3 can tighten this with a proper `satsuma/cursorContext` LSP notification if needed.
