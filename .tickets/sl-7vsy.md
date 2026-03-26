---
id: sl-7vsy
status: open
deps: []
links: []
created: 2026-03-26T06:17:27Z
type: task
priority: 2
assignee: Thorben Louw
tags: [lsp, vscode, feature-22]
---
# LSP support for @ref navigation

Add LSP-level support for @ref mentions in NL strings: hover (show referenced schema/field info), go-to-definition (jump to the referenced schema or field declaration), and completions (suggest schema/field names after typing @). Currently only TextMate highlighting works for @ref.

## Acceptance Criteria

- Hover on @ref shows schema/field information
- Go-to-definition on @ref jumps to the referenced schema or field
- Completions suggest schema/field names after typing @
- All existing LSP tests continue to pass
- New tests added for @ref LSP features

