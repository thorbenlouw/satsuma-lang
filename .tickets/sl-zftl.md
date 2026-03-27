---
id: sl-zftl
status: closed
deps: []
links: []
created: 2026-03-26T17:49:25Z
type: task
priority: 2
assignee: Thorben Louw
tags: [deps, maintenance]
---
# Audit and bump dependencies across all packages, target Node 22+

Audit npm dependencies across all package.json files (root, satsuma-cli, tree-sitter-satsuma, vscode-satsuma, vscode-satsuma/server) for deprecation warnings, known vulnerabilities, and outdated major versions. Bump to latest compatible versions and verify all tests pass on Node 22+. Address pre-existing test failures on Node 24 if feasible.

## Acceptance Criteria

- npm audit shows 0 critical/high vulnerabilities in all packages
- No deprecation warnings during npm install
- All CI tests pass on Node 22
- Local tests pass on Node 24 (or failures documented as upstream issues)
- package-lock.json files regenerated cleanly


## Notes

**2026-03-27T10:40:24Z**

**2026-03-27T12:00:00Z**

Cause: web-tree-sitter was on 0.25.x and some packages still had stale/native references after WASM migration.
Fix: Bumped web-tree-sitter to 0.26.7 in CLI and VS Code server; fixed WASM runtime filename (tree-sitter.wasm → web-tree-sitter.wasm renamed in 0.26); removed last native tree-sitter reference in workspace.ts. Root package has 3 moderate vulns in markdownlint-cli2 via smol-toml — no fix without downgrade, acceptable for dev-only linting tool. All critical/high vulns resolved across all packages. (commit ff5c1f9)
