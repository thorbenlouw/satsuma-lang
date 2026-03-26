---
id: sl-7bhh
status: closed
deps: []
links: [sl-3jgb]
created: 2026-03-26T13:55:04Z
type: bug
priority: 1
assignee: Thorben Louw
---
# Show Mapping Coverage: fails to detect cursor inside mapping block

The Show Mapping Coverage command says 'move cursor to mapping block' even when the cursor is inside one. extractMappingInfo() in coverage.ts uses regex on raw text lines instead of the parse tree. The regex matches single-quoted names (removed in v2) but not backtick names. Should use the tree-sitter CST via LSP to find the enclosing mapping_block node.

## Acceptance Criteria

1. Command works when cursor is anywhere inside a mapping block
2. Works with backtick-quoted mapping names
3. Works with plain identifier mapping names

