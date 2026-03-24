---
id: sl-ewv7
status: closed
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


## Notes

**2026-03-24T19:54:57Z**

Cause: New feature. Fix: Created formatting.ts with computeFormatting() that calls the shared CLI format() function. Registered documentFormattingProvider: true in capabilities. Added onDocumentFormatting handler. Cross-package import resolved by esbuild bundler (require() to avoid tsc rootDir conflict). 142 LSP tests passing, esbuild bundles successfully.
