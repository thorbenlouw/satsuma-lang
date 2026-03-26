---
id: sl-u4lf
status: open
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

