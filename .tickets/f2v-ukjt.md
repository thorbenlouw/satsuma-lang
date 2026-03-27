---
id: f2v-ukjt
status: closed
deps: []
links: []
created: 2026-03-27T07:12:43Z
type: task
priority: 2
assignee: Thorben Louw
tags: [viz, phase5]
---
# Phase 5.1: Schema card compact mode with namespace in title

Add a compact boolean property to sz-schema-card. When compact: hide fields, port dots, constraints, spread indicators, lineage buttons. Show header with namespace::name format when namespaced, metadata pills, and collapsible notes only.

## Acceptance Criteria

- compact property hides field list and field-level UI
- Header shows namespace::name when schema has a namespace
- Metadata pills and notes still visible
- Card height is significantly smaller than full mode


## Notes

**2026-03-27T07:27:20Z**

Cause: No compact mode existed for schema cards needed by the overview graph.
Fix: Added compact boolean property to sz-schema-card. When true, hides fields, port dots, constraints, spreads, lineage buttons. Shows namespace::name in header for namespaced schemas. Metadata pills and notes remain visible.
