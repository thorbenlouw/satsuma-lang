---
id: stm-j51n
status: open
deps: [stm-eqzd]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 1: Grammar skeleton and lexical rules

Define source_file as repeat(top_level_item). Define top_level_item choice for all block types. Add lexical tokens: identifier, quoted_name, backtick_name, nl_string, multiline_string, type_token, line_comment, warning_comment, question_comment. Add operator tokens: ->, |, ..., :, _. Add all keywords. Confirm keywords not valid as bare identifiers. Add corpus test/corpus/lexical.txt.

## Acceptance Criteria

- source_file and top_level_item defined
- All lexical tokens parse correctly
- All operators and keywords recognized
- Keywords rejected as bare identifiers in label positions
- test/corpus/lexical.txt passes

