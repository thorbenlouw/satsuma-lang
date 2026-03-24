---
id: sl-ewv7
status: open
deps: [sl-pdxy]
links: []
created: 2026-03-24T18:30:29Z
type: task
priority: 2
assignee: Thorben Louw
tags: [feat-20, phase-2]
---
# LSP DocumentFormattingProvider

Register DocumentFormattingProvider in the VS Code LSP server. Wire shared format() function (adapted for web-tree-sitter WASM) into the handler. Return TextEdit[] replacing full document. Verify format-on-save works with standard VS Code settings.

## Acceptance Criteria

- [ ] DocumentFormattingProvider registered in LSP server capabilities
- [ ] Format Document in VS Code produces identical output to CLI
- [ ] format-on-save works when user enables editor.formatOnSave
- [ ] Parse-error files: format request returns empty edits (no crash/corrupt)
- [ ] format() adapted for web-tree-sitter WASM API

