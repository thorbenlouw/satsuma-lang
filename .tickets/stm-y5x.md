---
id: stm-y5x
status: closed
deps: []
links: []
created: 2026-03-13T15:58:54Z
type: task
priority: 1
---
# Update tree-sitter grammar.js: namespace_decl, workspace_block, :: paths

Extend grammar.js with namespace_decl, workspace_block, ns_qualifier, namespaced_path, namespace_separator.

## Acceptance Criteria
- [ ] npm run generate succeeds with no conflicts
- [ ] All existing corpus tests still pass
- [ ] New corpus fixtures added for: namespace_decl, workspace_block, :: path, cross-namespace map header
- [ ] No grammar ambiguities introduced
- [ ] CST node names match docs/ast-mapping.md


