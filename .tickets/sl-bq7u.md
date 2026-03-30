---
id: sl-bq7u
status: closed
deps: [sl-y666, sl-4asu, sl-qe6b, sl-bdg6, sl-1myj, sl-pcgg]
links: []
created: 2026-03-30T06:29:46Z
type: epic
priority: 2
assignee: Thorben Louw
---
# epic: consolidate duplicated logic into @satsuma/core and shared packages

Across satsuma-cli, vscode-satsuma/server, and satsuma-viz, several pieces of logic and type infrastructure are duplicated or defined in ad hoc locations. This epic tracks the full cleanup: move canonical implementations into @satsuma/core (or @satsuma/viz-model for protocol types), test them once in core, and have all consumers import from the shared location.

Goal: a clean, modular surface where each piece of logic has exactly one home, is tested independently of its consumers, and can be reused by future tools without copy-paste.

Child tickets (in rough dependency order):
1. sl-y666 — string-utils (capitalize, normalizeName) — no deps, start here
2. sl-4asu — parser init / WASM loading
3. sl-qe6b — ERROR/MISSING node collection (parse-errors)
4. sl-bdg6 — mapping coverage logic (already exists)
5. sl-1myj — VizModel types into @satsuma/viz-model
6. sl-pcgg — semantic validation (depends on stable WorkspaceIndex shape)

## Acceptance Criteria

- All child tickets closed
- @satsuma/core has no logic that is duplicated in satsuma-cli or vscode-satsuma/server
- @satsuma/viz-model is the single source of truth for VizModel types
- No 'keep in sync' comments remain in the codebase


## Notes

**2026-03-30T13:15:00Z**

Cause: Multiple pieces of logic were duplicated across satsuma-cli, vscode-satsuma/server, and satsuma-viz with no shared home.

Fix: All six child tickets completed — string-utils, parser singleton, parse-errors, coverage path utility, VizModel types (in @satsuma/viz-model), and semantic validation — all now have canonical implementations in @satsuma/core (or @satsuma/viz-model). No "keep in sync" comments remain.
