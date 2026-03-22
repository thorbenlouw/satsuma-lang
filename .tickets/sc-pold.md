---
id: sc-pold
status: closed
deps: [sc-xnhw]
links: []
created: 2026-03-22T20:18:01Z
type: task
priority: 2
assignee: Thorben Louw
parent: sc-v2pn
tags: [vscode]
---
# Update VS Code TextMate grammar

Update keyword patterns — remove list block matching, add list_of/each/flatten. Update block label matching regex. Remove [] from path patterns. Test highlighting on updated examples.

## Acceptance Criteria

Syntax highlighting correct for all new constructs in all example files.


## Notes

**2026-03-22T20:46:50Z**

**2026-03-22T22:30:00Z**

Cause: TextMate grammar used keyword-first record/list block patterns and [] path syntax.
Fix: Replaced record/list block patterns with unified field keyword highlighting (record, list_of). Added each/flatten keywords in mapping body. Removed [] from all path regex patterns and array-indicator rule. (commit 0201f67)
