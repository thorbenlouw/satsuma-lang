# Feature 25 — TODO

Tickets created in `.tickets/`. Dependencies enforced via `tk dep`. See PRD.md for full design rationale.

## Phase 1 — Core Field Lineage Panel (replace existing implementation)

Start with `sc-aobl` — everything else in Phase 1 is blocked on it.

- [x] **sc-aobl** — New `FieldLineagePanel` host backed by `field-lineage` CLI
  - Single `satsuma field-lineage <schema.field> <workspacePath> --json --depth <n>` call (no more hop loop)
  - Sends `{ field, upstream, downstream, breadcrumb, isDark }` to webview
  - Handles `recenter` / `navigate` messages from webview
  - *(no blockers)*

- [x] **sc-rdrc** — Field-lineage webview renderer (ELK layout + SVG edges + design tokens)
  - ELK `layered` / `direction=RIGHT`, focal field pinned to centre layer
  - Node cards: orange header (schema) + monospace field row + muted `via_mapping` label
  - Edge colours by classification (orange / green / dashed-green / violet)
  - Breadcrumb toolbar with back navigation
  - *(blocked by sc-aobl)*

- [x] **sc-4kdu** — Remove input box from `traceFieldLineage`; use `actionContext` directly
  - No prompt when cursor is on a field
  - Quickpick fallback for command-palette use without field context
  - *(blocked by sc-aobl)*

- [x] **sc-p8h0** — `package.json` command surface cleanup for Phase 1
  - Rename context menu label; remove `showArrows` from right-click menu
  - *(blocked by sc-aobl, sc-rdrc, sc-4kdu)*

## Phase 2 — Cleanup + Viz Integration

All Phase 2 work can start once Phase 1 (`sc-p8h0`) is closed.

- [x] **sc-cim8** — Delete `showArrows` command entirely
  - Remove `src/commands/arrows.ts`, registrations, and `package.json` entries
  - *(blocked by sc-p8h0)*

- [x] **sc-358e** — Add "Trace Field Lineage" icon affordance to `sz-schema-card` field rows
  - `sz-field-lineage` CustomEvent → `viz.ts` → `panel.ts` → `executeCommand`
  - *(blocked by sc-4kdu)*

- [x] **sc-vwz0** — Fix `coverage.ts` regex mapping extraction → use LSP `actionContext`
  - Delete `extractMappingInfo`; add `mappingName`/`targetSchema` to LSP actionContext response
  - *(no blockers — independent)*

## Phase 3 — Polish

- [ ] **sc-0bj3** — Depth slider + classification filter in field lineage panel
  - Depth re-runs CLI; filter is client-side only
  - *(blocked by sc-rdrc)*

- [ ] **sc-64j5** — Upgrade `showLineage` schema-level view to webview DAG
  - Schema pills + mapping pills + ELK layout; replaces output channel
  - *(no blockers — independent)*

## Dependency graph summary

```
sc-aobl
├── sc-rdrc ──────────────────── sc-0bj3 (P3)
│   └── (sc-p8h0)
├── sc-4kdu ──────────────────── sc-358e (P2)
│   └── (sc-p8h0)
└── sc-p8h0 ──────────────────── sc-cim8 (P2)

sc-vwz0   (independent)
sc-64j5   (independent)
```

## Ready to start now

```
tk ready
```

Should show: **sc-aobl**, **sc-vwz0**, **sc-64j5**
