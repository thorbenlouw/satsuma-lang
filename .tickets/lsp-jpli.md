---
id: lsp-jpli
status: closed
deps: [lsp-tze4]
links: []
created: 2026-03-25T17:36:08Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [phase-4, vscode]
---
# P4.4: Update VS Code for backtick-only labels

Remove quoted_name references from TextMate grammar and LSP server. Update single-quote patterns to backtick.

## Acceptance Criteria

- No quoted_name references in VS Code extension code
- TextMate grammar highlights backtick labels correctly
- LSP server handles backtick labels in all features
- Extension compiles


## Notes

**2026-03-26T01:46:29Z**

**2026-03-26T19:00:00Z**
Cause: Code/files referenced single-quoted labels.
Fix: Already completed in P4.1/P4.2 commits. CLI extraction uses backtick_name, formatter outputs backtick labels, VS Code LSP/TextMate updated, all examples migrated. All tests pass.
