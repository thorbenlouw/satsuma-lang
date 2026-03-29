---
id: sc-vwz0
status: closed
deps: []
links: []
created: 2026-03-29T12:54:17Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [vscode, phase-2, coverage, lsp]
---
# vscode: fix coverage.ts regex mapping extraction — use LSP actionContext

src/commands/coverage.ts uses a hand-rolled regex (extractMappingInfo) to find the mapping name and target schema from the raw document text at the cursor position. This is fragile: it breaks for backtick-quoted mapping names with spaces, anonymous mappings, and namespaced mappings. Replace it with a call to client.sendRequest('satsuma/actionContext', { uri, position }) which the LSP already computes correctly. The actionContext response needs to include mappingName and targetSchema fields (or these need to be added to the LSP server's actionContext handler if not already present).

## Acceptance Criteria

- Coverage command works correctly for: named mappings, backtick-quoted mapping names with spaces, namespaced mappings (ns::name)
- Coverage command shows a clear message for anonymous mappings ('Anonymous mappings are not supported by coverage — use a named mapping')
- extractMappingInfo regex function is deleted
- LSP actionContext handler returns mappingName and targetSchema when cursor is inside a mapping block
- Existing coverage decoration and status bar behaviour is unchanged


## Notes

**2026-03-29T13:16:43Z**

**2026-03-29**

Cause: coverage.ts used regex walking (extractMappingInfo) to find mappingName/targetSchema, which was fragile and duplicated logic that the CST already encodes.
Fix: Extended ActionContext with mappingName/targetSchema; added inferMappingContext() in server/src/action-context.ts to walk the CST up to the enclosing mapping_block and extract the block_label and target_block schema. Deleted extractMappingInfo from coverage.ts; coverage command now reads from getEditorActionContext.
