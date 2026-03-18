---
id: stm-iohm
status: closed
deps: []
links: []
created: 2026-03-18T16:51:40Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u32p
tags: [cli, feature-10]
---
# Transform classifier and field-level arrow index

Create src/classify.js (classifyTransform, classifyArrow) and extend src/extract.js to capture per-arrow records with source/target paths, raw transform text, decomposed pipe steps, classification, and derived flag. Add fieldArrows index to WorkspaceIndex.

## Acceptance Criteria

- [ ] classifyTransform returns 'structural' for pipelines of token_call/map_literal/fragment_spread
- [ ] classifyTransform returns 'nl' for nl_string/multiline_string-only transforms
- [ ] classifyTransform returns 'mixed' for transforms with both types
- [ ] classifyTransform returns 'none' for arrows with no transform body
- [ ] classifyArrow correctly flags derived arrows (no source path)
- [ ] Per-arrow records include: source path, target path, transform_raw, steps[], classification, derived, file, line
- [ ] fieldArrows index maps "schema.field" to ArrowRecord[]
- [ ] Unit tests for classifier against structural, NL, mixed, and bare arrows
- [ ] Unit tests for field-level extraction against examples/ corpus
- [ ] Existing Feature 09 commands still pass

