---
id: f2v-davz
status: closed
deps: []
links: []
created: 2026-03-26T23:14:53Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase2]
---
# Phase 2: Expand buttons for cross-file lineage on schemas

Add expand buttons (◂ upstream / ▸ downstream) on schema cards that have hasExternalLineage=true. Clicking requests VizModel for the linked file and merges it into the current layout.

## Acceptance Criteria

- Expand buttons appear on schema cards with hasExternalLineage
- Click upstream (◂) loads and renders the source file's schemas to the left
- Click downstream (▸) loads and renders the consumer file's schemas to the right
- Merged layout re-runs ELK to position new cards


## Notes

**2026-03-26T23:20:26Z**

Expand buttons rendered on schema cards with hasExternalLineage. New LSP request satsuma/vizLinkedFiles returns cross-file URIs. VizPanel fetches linked VizModels and sends to webview. Root component merges expanded models into layout, deduplicating by qualified ID.
