---
id: sc-0bj3
status: open
deps: [sc-rdrc]
links: []
created: 2026-03-29T12:54:28Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [vscode, phase-3, field-lineage]
---
# vscode: depth slider and classification filter in field lineage panel

Add a toolbar to the FieldLineagePanel webview with: (1) A depth slider (range 1–10, default 3) — changing it posts { type: 'setDepth', depth } to the extension host which re-runs the CLI with --depth <n> and sends fresh fieldLineageData. (2) A classification filter dropdown (options: All / Structural / NL / Structural+NL-derived) — filtering is applied client-side on the already-loaded payload without a CLI re-run, by hiding/showing nodes whose only edges match the excluded classifications.

## Acceptance Criteria

- Depth slider is visible in the toolbar, renders with --sz-* token colours
- Changing depth re-runs the CLI query and re-renders the layout
- Classification filter applies immediately without re-running the CLI
- Setting filter to 'Structural' hides all NL and nl-derived edges and removes orphaned nodes
- Setting filter back to 'All' restores the full graph
- Depth and filter values persist when re-centring on a new field (user's preference is remembered for the session)
- Panel is still usable at minimum depth=1 (shows only direct upstream/downstream)

