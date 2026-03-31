---
id: sl-mypf
status: open
deps: [sl-o9mh]
links: []
created: 2026-03-31T09:45:36Z
type: task
priority: 1
assignee: Thorben Louw
tags: [docs, adr-022]
---
# ADR-022: update core docs — SATSUMA-CLI.md, AI-AGENT-REFERENCE.md, HOW-DO-I.md, CLAUDE.md

Update all core documentation to reflect file-based CLI scope per ADR-022. Directory arguments no longer exist.

Files:
- SATSUMA-CLI.md — all command examples use directories (summary examples/, graph examples/, fmt examples/, validate ., lint .)
- AI-AGENT-REFERENCE.md — ~10 examples with path/to/workspace/ or path/
- HOW-DO-I.md — 4+ lines referencing satsuma <cmd> <dir>
- CLAUDE.md — platform entry point section may need update
- PROJECT-OVERVIEW.md — if it references directory-level commands

All examples must use file entry points. Document the workspace-is-defined-by-import-graph model.

