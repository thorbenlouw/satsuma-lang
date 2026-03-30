---
id: sl-idw9
status: closed
deps: [sl-z6ps]
links: [sl-4afx]
created: 2026-03-30T18:23:33Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-jvwu
tags: [lsp, core]
---
# lsp: migrate viz-model.ts metadata extraction to core extractMetadata()

viz-model.ts implements extractMetadataEntries() which parses metadata_block CST nodes into flat {key, value} pairs. Core's extractMetadata() returns a richer discriminated union (MetaEntry with kinds: tag, kv, enum, note, slice).

**Which implementation to prefer:**
Core's — it preserves type information that the viz flattening discards. The viz layer should consume core's MetaEntry[] and map to its flat shape in an adapter.

**Specific divergences to reconcile:**
- Core returns {kind:'tag', tag:'pk'}; viz returns {key:'pk', value:''}
- Core returns {kind:'note', text:'...'}; viz returns {key:'note', value:'...'}
- Core returns {kind:'enum', values:[...]}; viz doesn't extract enums at all
- Neither core nor viz-model properly unescapes string values (see sl-via3)

**Work:**
1. Delete extractMetadataEntries() from viz-model.ts.
2. Import extractMetadata from @satsuma/core/meta-extract.
3. Add a thin adapter function (e.g., metaEntryToKV()) that maps MetaEntry → {key, value} for viz consumption.
4. Verify that constraint tag extraction (CONSTRAINT_TAGS filtering) still works — this is viz-specific and stays in viz-model, operating on core's MetaEntry[].
5. Move metadata extraction tests from LSP to core; keep only adapter tests in LSP.

**Validation before PR:**
- Viz metadata display unchanged (visual regression check)
- Core tests comprehensively cover all metadata kinds
- Code meets AGENTS.md standards: adapter function has doc-comment, CONSTRAINT_TAGS constant has source comment

## Acceptance Criteria

- viz-model.ts extractMetadataEntries() deleted
- All metadata extraction goes through core extractMetadata()
- Thin adapter maps MetaEntry to viz's flat shape
- CONSTRAINT_TAGS filtering preserved in viz layer
- Metadata extraction tests live in core, not LSP

