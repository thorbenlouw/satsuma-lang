---
id: stm-8q1r
status: open
deps: [stm-xdhb]
links: []
created: 2026-03-18T10:46:23Z
type: task
priority: 2
assignee: Thorben Louw
tags: [vscode-v2]
---
# Implement v2 keyword and block patterns

Add TextMate patterns for v2 reserved keywords: schema, fragment, mapping, transform, record, list, map, note, import/from, source/target (as sub-block keywords). Each keyword should match in its declaration context with optional block label (bare or single-quoted) followed by optional (metadata) and {body}.

