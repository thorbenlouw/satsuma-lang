---
id: sl-60gz
status: closed
deps: [sl-sado]
links: []
created: 2026-03-29T18:51:07Z
type: task
priority: 1
assignee: Thorben Louw
---
# feat(26): LSP — migrate CST helpers from parser-utils to satsuma-core

Update the LSP server to import its CST navigation helpers from satsuma-core instead of defining them locally in parser-utils.ts.

Changes to vscode-satsuma/server/src/parser-utils.ts:
1. Remove the local definitions of child(), children(), labelText(), stringText()
2. Import them from '@satsuma/core' (or '@satsuma/core/cst-utils')
3. Re-export them from parser-utils.ts so all other server files that import from './parser-utils' continue to work without changes

This is a low-risk surgical change — it removes ~28 lines of duplicate implementation while keeping the existing import surface identical for the rest of the LSP server.

Note: initParser(), getParser(), getLanguage(), parseSource(), nodeRange() STAY in parser-utils.ts — they are LSP-specific (WASM initialization and LSP Range construction) and belong there.

Also update the SyntaxNode/Tree type re-exports: parser-utils currently re-exports these from web-tree-sitter; after this change, it can import from both @satsuma/core (for the abstract interface) and web-tree-sitter (for the concrete WASM types). The two must remain compatible — the concrete web-tree-sitter Node must satisfy the abstract SyntaxNode interface from satsuma-core/types.

## Acceptance Criteria

1. parser-utils.ts has no local definitions of child, children, labelText, stringText 2. Those 4 functions are imported from @satsuma/core 3. All other LSP server files that import from './parser-utils' continue to compile without changes 4. All 17 LSP server test files pass 5. VS Code extension builds (npm run compile in vscode-satsuma/) 6. No new dependencies added to vscode-satsuma/server/package.json beyond @satsuma/core (which is already there)


## Notes

**2026-03-29T20:48:39Z**

**2026-03-29T20:48:00Z** Cause: LSP parser-utils.ts defined child/children/labelText/stringText locally, duplicating satsuma-core implementations. Fix: Replaced local implementations with wrapper functions importing from @satsuma/core, using 'as Node' casts to bridge the SyntaxNode (abstract) vs Node (concrete web-tree-sitter) type gap. All 280 LSP tests pass and extension builds cleanly.
