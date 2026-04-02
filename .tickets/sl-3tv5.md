---
id: sl-3tv5
status: open
deps: []
links: []
created: 2026-04-02T09:19:27Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-m2s6
---
# grammar: simplify pipe_text — all steps are NL, remove arithmetic operators

Simplify the tree-sitter grammar so every token sequence between pipe delimiters (or between { and } / |) is a single NL step. Remove arithmetic operator rules (* + - / as pipe step content). Remove function-call sub-rules from pipe_text (round(2), split("/"), parse("...") are now plain NL text — no special parse tree node). pipe_text becomes a simple permissive text rule.

## Acceptance Criteria

1. grammar.js: arithmetic operator rules removed from pipe_text context
2. grammar.js: function-call sub-rules removed from pipe_text (they remain valid as NL text but have no special CST node)
3. tree-sitter parser regenerated and all existing corpus tests updated
4. New corpus tests for: bare tokens as NL, arithmetic-style text as NL, function-call-style text as NL
5. No regressions in existing .stm parse tests

