---
id: stm-jruy
status: closed
deps: []
links: [stm-2szj, stm-eg9u, stm-5pi1, stm-pzwn, stm-to29, stm-d281]
created: 2026-03-16T15:46:11Z
type: task
priority: 3
assignee: Thorben Louw
tags: [rename-mapping-keyword]
---
# Update feature PRDs and TODOs for mapping keyword rename

Update references to the top-level map keyword in features/01-treesitter-parser/PRD.md, features/01-treesitter-parser/TODO.md, features/02-multi-schema/PRD.md, features/03-vscode-syntax-highlighter/TODO.md, and features/03-vscode-syntax-highlighter/PRD.md. Change top-level map block references to mapping. Keep value-map references as map.

## Acceptance Criteria

All feature docs use mapping for the top-level block keyword. No stale references to map as a block keyword remain in feature docs.

