---
id: sl-4afx
status: closed
deps: [sl-mphz, sl-z6ps]
links: [sl-i2k9, sl-idw9, sl-p6nd, sl-ys4h]
created: 2026-03-30T18:24:25Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-jvwu
tags: [lsp, core]
---
# lsp: migrate viz-model.ts schema/mapping/metric/field extraction to core extract* functions

viz-model.ts implements its own extraction for all major entity types instead of using core:

- extractSchemaCard() — extracts schema name, label, notes, fields, spreads, external lineage flag
- extractMappingBlock() — extracts mapping sources, targets, arrows with transforms
- extractMetricCard() — extracts metric display name, grain, slices, sources, fields
- extractFieldEntries() / extractSingleField() — recursive field tree with constraints, notes, comments, location
- extractSpreads() — finds fragment_spread nodes
- Various arrow extraction within mapping blocks

Core provides: extractSchemas(), extractMappings(), extractMetrics(), extractFragments(), extractFieldTree(), extractArrowRecords() — all returning rich Extracted* types.

**Which implementation to prefer:**
Core's extractors are canonical and well-tested. However, viz needs additional data that core currently doesn't carry:
- Source location (line, column) on fields — core's FieldDecl lacks this
- Constraint tags parsed from field metadata — core has raw MetaEntry[], viz filters for constraints
- Comments (warning/question) associated with entities — core extracts these separately
- Notes within blocks — core extracts these separately

**Reconciliation approach:**
Core's Extracted* types are the base. The viz layer adds an adapter that enriches core output with:
1. Location data (available from the CST node positions that core already has access to during extraction)
2. Comment/note association (can be done post-extraction by matching line ranges)
3. Constraint filtering (adapter maps MetaEntry[] -> constraint list)

If core needs to carry more position data, extend Extracted* types with optional position fields.

**Work:**
1. Audit what position data core's Extracted* types already carry vs what viz needs.
2. Add optional position fields to core types where viz needs them (e.g., field-level line/column).
3. Rewrite viz-model extraction to call core's extract* functions.
4. Create adapter layer: ExtractedSchema -> SchemaCard, ExtractedMapping -> MappingBlock, etc.
5. Handle viz-specific enrichment (comments, notes, constraint filtering) in the adapter.
6. Delete all local extraction functions from viz-model.ts.
7. Preserve viz-specific logic: injectImportedSchemaStubs(), namespace grouping, arrow-to-transform mapping.
8. Move extraction tests to core; keep only adapter and viz-specific tests in LSP.

**Validation before PR:**
- Viz renders identically for all example files (visual regression)
- All core and LSP tests pass
- Code meets AGENTS.md standards: adapter functions have doc-comments explaining the mapping, viz-specific logic clearly labelled with section comments
- Grep confirms no remaining extract* reimplementations in viz-model.ts

## Acceptance Criteria

- viz-model.ts uses core extract* functions for all entity extraction
- Local extractSchemaCard/extractMappingBlock/extractMetricCard/extractFieldEntries/extractSingleField deleted
- Adapter layer maps core types to viz types with doc-comments
- Core types extended with position data where needed
- Extraction tests consolidated in core; viz tests cover only adapter

