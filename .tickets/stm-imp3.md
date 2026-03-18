---
id: stm-imp3
status: open
deps: []
links: []
created: 2026-03-18T12:18:41Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u65b
tags: [cli]
---
# Phase 0: CLI scaffold

Create tooling/stm-cli/ directory. Init package.json with bin stm. Add tree-sitter and tree-sitter-stm dependencies. Set up CLI argument parser (commander or minimist). Write src/index.js entry point dispatching to command modules. Add README.md.

## Acceptance Criteria

- tooling/stm-cli/ exists with package.json
- bin entry configured
- tree-sitter deps linked
- CLI entry point dispatches commands
- README.md with usage examples

