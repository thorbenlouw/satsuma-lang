---
id: stm-2szj
status: closed
deps: []
links: [stm-jruy, stm-eg9u, stm-5pi1, stm-pzwn, stm-to29, stm-d281]
created: 2026-03-16T15:45:38Z
type: task
priority: 2
assignee: Thorben Louw
tags: [rename-mapping-keyword]
---
# Rename top-level map keyword to mapping in secondary docs

Update PROJECT-OVERVIEW.md, IMPROVEMENTS.md, IMPLEMENTATION-GUIDE.md, docs/tree-sitter-ambiguities.md, docs/tree-sitter-precedence.md, and docs/ast-mapping.md. Change top-level map block references to mapping. Keep value-map literal map { key: val } unchanged.

## Acceptance Criteria

All top-level map block references in these files use mapping. Prose references to map blocks are updated (e.g. map block -> mapping block). Value-map literal references unchanged.

