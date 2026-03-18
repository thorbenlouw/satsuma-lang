---
id: stm-xvpb
status: open
deps: [stm-xdhb]
links: []
created: 2026-03-18T10:46:26Z
type: task
priority: 2
assignee: Thorben Louw
tags: [vscode-v2]
---
# Implement v2 string and comment patterns

Add TextMate patterns for: """...""" triple-double-quoted multiline strings (begin/end, robust against unterminated), "..." double-quoted strings with \" escape, backtick identifiers, single-quoted block labels. Add three comment patterns with distinct scopes: // info, //\! warning, //? question/TODO.

