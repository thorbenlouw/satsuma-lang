---
id: stm-k75c
status: closed
deps: [stm-j51n]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 2: Import declarations

Parse import { 'name', 'name2' } from "path". Node types: import_decl, import_name (list), import_path. Add corpus test/corpus/imports.txt.

## Acceptance Criteria

- import declarations parse correctly
- test/corpus/imports.txt passes

