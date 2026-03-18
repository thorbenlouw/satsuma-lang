---
id: stm-mzwe
status: closed
deps: [stm-8bc6, stm-yoy2, stm-egiw, stm-qjye, stm-migi, stm-26ez, stm-jq1y, stm-ykb5, stm-7vwu]
links: []
created: 2026-03-18T12:18:41Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u65b
tags: [cli]
---
# Phase 11: Error handling and polish

Consistent exit codes (0=success, 1=not found, 2=parse error). All commands have --help. Top-level --help and --version. Parse errors to stderr. Ambiguous name warnings.

## Acceptance Criteria

- Exit codes consistent across all commands
- --help works on every command
- --version prints package version
- Parse errors go to stderr
- Ambiguous names warned

