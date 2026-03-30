---
id: sl-o4by
status: closed
deps: [sl-mphz, sl-z6ps]
links: [sl-d0je]
created: 2026-03-30T18:23:03Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-jvwu
tags: [lsp, core]
---
# lsp: migrate workspace-index.ts entity extraction to core extract* functions

workspace-index.ts implements its own CST walking in indexTopLevel() to extract schemas, mappings, fragments, metrics, transforms, namespaces, and imports. Core provides extractSchemas(), extractMappings(), extractFragments(), extractMetrics(), extractTransforms(), extractNamespaces(), extractImports() — none of which are called by the LSP.

**Which implementation to prefer:**
Core's extractors return richer data (metadata, spreads, notes, field trees). The LSP's extractors return DefinitionEntry records with ranges. These are not interchangeable — the LSP needs range/position data that core doesn't currently carry.

**Reconciliation approach:**
1. Core's extract* functions should optionally carry source position (startRow, startColumn) — they already carry 'row' on most types.
2. The LSP should call core's extract* functions to get the canonical extraction, then map to DefinitionEntry using the position data.
3. The LSP's indexTopLevel() becomes a thin dispatcher: parse with core, then index the results into its definition/reference maps.

**Work:**
1. Audit core's Extracted* types for position completeness — add startColumn where missing.
2. Rewrite workspace-index.ts indexTopLevel() to call core extract* functions instead of walking CST directly.
3. Create adapter functions: ExtractedSchema -> DefinitionEntry, ExtractedMapping -> DefinitionEntry, etc.
4. Preserve the LSP's reference-tracking logic (indexMappingRefs, indexSpreadRefs, indexArrowFieldRefs, indexMetricRefs) — these may still need CST access for positions, but should operate on core-extracted data where possible.
5. Delete local extraction helpers that are now redundant.
6. Move extraction tests from LSP to core where they test extraction correctness; keep LSP tests only for adapter/wiring behaviour.

**Validation before PR:**
- All LSP features work: go-to-definition, find-references, completions, hover, rename, CodeLens
- All core and LSP tests pass
- Code meets AGENTS.md standards: module comment on workspace-index explains its role as 'wiring layer', adapter functions have doc-comments
- Grep confirms no remaining extract* reimplementations in LSP

## Acceptance Criteria

- workspace-index.ts calls core extract* functions for all entity types
- No local CST walking for entity extraction remains in workspace-index.ts
- DefinitionEntry construction uses adapter layer over core types
- Extraction tests consolidated into core; LSP tests cover only wiring
- All LSP features verified working

