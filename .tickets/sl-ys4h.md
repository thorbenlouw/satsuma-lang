---
id: sl-ys4h
status: open
deps: [sl-z6ps]
links: [sl-4afx]
created: 2026-03-30T18:24:05Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-jvwu
tags: [lsp, core]
---
# lsp: migrate viz-model.ts spread resolution to core expandEntityFields()

viz-model.ts implements resolveAndStripSpreads() which iteratively expands fragment spreads across all namespaces (20-pass limit), then deletes fragment entries entirely. Core's expandEntityFields() does the same expansion via callbacks with proper cycle detection and diagnostic reporting.

**Key behavioural differences:**
- Core detects cycles and reports SpreadDiagnostic[]; viz silently skips via visited set
- Core preserves fragments; viz deletes them post-expansion
- Core returns ExpandedField[] with fromFragment provenance; viz mutates fields in-place
- Core takes EntityRefResolver + SpreadEntityLookup callbacks; viz builds internal maps

**Which implementation to prefer:**
Core's — it has better cycle detection, diagnostic reporting, and the callback design (ADR-005) enables clean decoupling. The viz-specific behaviour (deleting fragments, mutating in-place) is an adapter concern.

**Work:**
1. In viz-model.ts, delete resolveAndStripSpreads().
2. Create EntityRefResolver and SpreadEntityLookup callbacks from the viz's namespace data (follow the same pattern as CLI's spread-expand.ts shim).
3. Call core's expandEntityFields() for each schema/entity that has spreads.
4. Map ExpandedField[] back to viz's FieldEntry[] shape.
5. Delete fragment entries from namespace groups after expansion (viz-specific post-processing step, clearly labelled).
6. Handle diagnostics: log cycle warnings or surface them in viz as appropriate.
7. Verify diamond and transitive spread cases produce identical results to before.
8. Move spread expansion tests to core; keep only wiring tests in LSP.

**Validation before PR:**
- Viz spread display unchanged (test with nested, transitive, and diamond spreads)
- Core tests cover all expansion edge cases including cycles and diamonds
- Code meets AGENTS.md standards: callback construction has doc-comment, fragment deletion step has section comment

## Acceptance Criteria

- viz-model.ts resolveAndStripSpreads() deleted
- Spread expansion uses core expandEntityFields() via callbacks
- Cycle detection and diagnostics from core are handled
- Fragment deletion is a clearly-labelled post-processing step
- Spread expansion tests consolidated in core

