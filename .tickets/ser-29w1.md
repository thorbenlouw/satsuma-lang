---
id: ser-29w1
status: open
deps: []
links: []
created: 2026-03-24T20:33:08Z
type: chore
priority: 3
assignee: Thorben Louw
tags: [refactor, tech-debt]
---
# Extract shared satsuma-core package for cross-package code sharing

The LSP server's formatting.ts imports format() from satsuma-cli via an esbuild alias and a computed dynamic import path. This works but is fragile — the esbuild alias maps 'satsuma-fmt' to the CLI source, and tests use a runtime dynamic import to the CLI's dist/. A cleaner long-term approach: extract format() (and potentially other shared utilities like types.ts) into a new tooling/satsuma-core/ package that both satsuma-cli and vscode-satsuma depend on via npm workspace links. This eliminates the cross-package import hacks and makes the dependency explicit.

