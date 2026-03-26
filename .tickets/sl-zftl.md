---
id: sl-zftl
status: in_progress
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

