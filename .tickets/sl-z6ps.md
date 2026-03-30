---
id: sl-z6ps
status: open
deps: []
links: []
created: 2026-03-30T18:36:07Z
type: task
priority: 0
assignee: Thorben Louw
parent: sl-jvwu
tags: [lsp]
---
# Extract satsuma-lsp package from vscode-satsuma/server (ADR-021)

Move vscode-satsuma/server/ into a new top-level package at tooling/satsuma-lsp/. See ADR-021 for the full rationale.

**Work:**
1. Create tooling/satsuma-lsp/ with package.json (@satsuma/lsp), tsconfig.json, and build config.
2. Move all files from vscode-satsuma/server/src/ to satsuma-lsp/src/.
3. Move server tests to satsuma-lsp/test/.
4. Update vscode-satsuma to depend on @satsuma/lsp — the extension launches the LSP server as a child process (or bundled module).
5. Remove vscode-satsuma/server/ directory entirely.
6. Update root workspace package.json to include satsuma-lsp.
7. Update npm run install:all and any build scripts.
8. Add a bin entry so satsuma-lsp can be run standalone: npx satsuma-lsp --stdio.
9. Verify all LSP features still work in VSCode after the move.
10. Verify satsuma-lsp builds and tests independently.

**Validation before PR:**
- All LSP features work in VSCode (manual smoke test)
- satsuma-lsp builds independently (npm run build in its directory)
- satsuma-lsp tests pass independently
- vscode-satsuma builds without server/ directory
- Code meets AGENTS.md standards: package has module-level README comment in index, build scripts documented
- No broken imports across the monorepo

## Acceptance Criteria

- tooling/satsuma-lsp/ exists as independent package
- vscode-satsuma/server/ deleted
- vscode-satsuma depends on satsuma-lsp
- satsuma-lsp has standalone bin entry (--stdio)
- All tests pass in both packages
- Root install:all script updated

