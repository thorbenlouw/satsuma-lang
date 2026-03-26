---
id: ser-aasp
status: closed
deps: []
links: []
created: 2026-03-26T17:40:21Z
type: feature
priority: 2
assignee: Thorben Louw
---
# VizModel interfaces, extraction, and LSP handler

Phase 1.1 of Feature 23 (Mapping Visualization). Define VizModel TypeScript interfaces, implement buildVizModel() extraction from parse tree, register satsuma/vizModel custom LSP request, and add 57 unit tests.

## Acceptance Criteria

- VizModel interfaces match PRD specification
- buildVizModel() correctly extracts schemas, fields, mappings, arrows, transforms, notes, comments, metrics, fragments, namespaces
- satsuma/vizModel custom LSP request registered in server.ts
- Unit tests cover all construct types
- All 21 example files produce valid VizModels
- Existing tests unaffected


## Notes

**2026-03-26T17:40:31Z**

## Notes

**2026-03-26T17:45:00Z**

Cause: Feature 23 (Mapping Visualization) requires a VizModel JSON schema and LSP handler to provide structured data for the renderer.
Fix: Created viz-model.ts with all PRD interfaces + buildVizModel() extraction logic walking the tree-sitter CST. Added satsuma/vizModel custom LSP request in server.ts. 57 unit tests cover all constructs and all 21 example files.
