---
id: stm-xdhb
status: open
deps: [stm-ffar]
links: []
created: 2026-03-18T10:46:21Z
type: task
priority: 2
assignee: Thorben Louw
tags: [vscode-v2]
---
# Strip v1-only patterns from TextMate grammar

Remove from tooling/vscode-stm/syntaxes/stm.tmLanguage.json: integration keyword, table/message/event/lookup declaration keywords, => operator, @annotation(...) patterns, [tag, tag] bracket-tag patterns, triple-single-quote '''...''' strings, when/else/fallback flow-control keywords.

