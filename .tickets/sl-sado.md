---
id: sl-sado
status: open
deps: [sl-8pj3]
links: []
created: 2026-03-29T18:49:28Z
type: task
priority: 1
assignee: Thorben Louw
---
# feat(26): satsuma-core — cst-utils module

Create satsuma-core/src/cst-utils.ts containing the CST navigation helpers that are currently duplicated in satsuma-cli/src/extract.ts and vscode-satsuma/server/src/parser-utils.ts.

Functions to consolidate:
- child(node, type): SyntaxNode | null
- children(node, type): SyntaxNode[]
- allDescendants(node, type, acc?): SyntaxNode[]
- labelText(node): string | null  (reads block_label child)
- stringText(node): string | null  (strips NL/multiline string delimiters)
- entryText(node): string | null  (strips backtick_name/nl_string delimiters)

Both implementations are semantically identical. The CLI version is private (no export keyword); the LSP version is exported from parser-utils. The LSP version has slight null-safety differences (filters c !== null) — the consolidated version must include these.

Export all from satsuma-core/src/index.ts under a cst-utils subpath export as well as the main index.

## Acceptance Criteria

1. satsuma-core/src/cst-utils.ts exists and exports all 6 functions 2. satsuma-core package.json adds a './cst-utils' export entry 3. satsuma-core/src/index.ts re-exports from cst-utils 4. Unit tests in satsuma-core/test/cst-utils.test.js verify each function against representative CST shapes 5. satsuma-core builds without errors (tsc) 6. No changes yet to CLI or LSP (consumers migrated in later tickets)

