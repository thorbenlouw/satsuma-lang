---
id: lsp-ar7x
status: closed
deps: [lsp-6agr]
links: []
created: 2026-03-25T17:29:21Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-3, vscode]
---
# P3.9: Update VS Code LSP for simplified CST

Update all LSP server files that reference removed CST node types (kv_comparison, arithmetic_step, token_call, quoted_name variants).

## Acceptance Criteria

- No references to removed node types in LSP server code
- LSP server compiles
- Semantic tokens, hover, definition, completions work with new node types
- LSP tests pass


## Notes

**2026-03-26T01:18:02Z**

**2026-03-26T16:40:00Z**

Cause: LSP server code referenced removed CST node types.
Fix: Already completed in P3.1/P3.2 commits. codelens.ts, hover.ts, workspace-index.ts updated to use tag_with_value, pipe_text, hoverPipeText. All LSP and semantic-token tests pass.
