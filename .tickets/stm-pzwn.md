---
id: stm-pzwn
status: open
deps: []
links: [stm-jruy, stm-2szj, stm-eg9u, stm-5pi1, stm-to29, stm-d281]
created: 2026-03-16T15:45:47Z
type: task
priority: 1
assignee: Thorben Louw
tags: [rename-mapping-keyword]
---
# Update tree-sitter corpus tests: map -> mapping in top_level.txt and paths.txt

The corpus test files top_level.txt and paths.txt still use the old map keyword in STM input text. Update these to use mapping. The expected CST output references to map_block node name stay as-is (node rename is a separate task).

## Acceptance Criteria

All STM input snippets in top_level.txt and paths.txt use mapping for the top-level block keyword. Tests pass after tree-sitter generate + test.

