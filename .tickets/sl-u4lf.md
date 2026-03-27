---
id: sl-u4lf
status: closed
deps: []
links: []
created: 2026-03-26T13:55:13Z
type: feature
priority: 3
assignee: Thorben Louw
---
# LSP: add context-aware lineage actions (Lineage To / Lineage From)

Currently lineage is only available via command palette with manual schema selection or field path input. Users expect inline actions (code lens, context menu, or hover) that pick up the schema or field at cursor position. Proposed: code lens on schema blocks for Lineage from/to, and context menu on field paths for Trace field lineage.

## Acceptance Criteria

1. Schema blocks show Lineage from / Lineage to code lens actions
2. Clicking a lineage code lens opens the lineage view without requiring manual input
3. Context menu on fields in arrows offers Trace field lineage


## Notes

**2026-03-27T12:35:30Z**

Cause: Lineage actions in the VS Code extension only existed as manual commands, so schema and field context at the cursor was not wired into code lenses or the field lineage webview.
Fix: Added schema Lineage from/to code lenses plus a server-backed action-context request so commands can resolve schema and field paths directly from the cursor without manual input (commit 3fec60c).
