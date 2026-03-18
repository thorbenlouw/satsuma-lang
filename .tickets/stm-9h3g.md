---
id: stm-9h3g
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
# Phase 5: Transform blocks

Parse transform <label> { <transform_body> }. transform_body is a pipe_chain shared with arrow transform bodies. Add corpus test/corpus/transforms.txt.

## Acceptance Criteria

- transform blocks parse correctly
- pipe_chain shared production works
- test/corpus/transforms.txt passes

