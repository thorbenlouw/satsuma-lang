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
# ADR-022: update core docs for file-based CLI scope and explicit import scoping

Update core documentation to reflect the actual ADR-022 decision. Directory arguments are removed; the key distinction is between workspace scope selected by a file entry point and symbol scope inside a file. The same file/import-graph scope rule applies in IDE/LSP features too.

Files:
- `SATSUMA-CLI.md`
- `AI-AGENT-REFERENCE.md`
- `HOW-DO-I.md`
- `CLAUDE.md`
- `PROJECT-OVERVIEW.md` if needed

Documentation goals:
- use file-entry examples instead of directory examples
- explain that imports are explicit and that imported symbols bring only their exact transitive dependencies
- distinguish workspace scope from in-file symbol scope
- state explicitly that IDE/LSP features do not treat the workspace folder as an implicit merged scope
