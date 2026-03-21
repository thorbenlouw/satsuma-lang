---
id: sl-6mlu
status: closed
deps: []
links: [sl-m02g]
created: 2026-03-21T08:02:22Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, nl, exploratory-testing]
---
# nl: --json line numbers are 0-indexed, inconsistent with arrows command

satsuma nl --json reports line numbers as 0-indexed (tree-sitter row), while satsuma arrows --json reports 1-indexed line numbers. This cross-command inconsistency makes it unreliable for consumers to use the line field without knowing which command produced it.

- What I did: satsuma nl source_data.email /tmp/satsuma-test-nl/comprehensive.stm --json
  Then: satsuma arrows source_data.email /tmp/satsuma-test-nl/comprehensive.stm --json
- nl reports line: 19 for the inline note on file line 20 (0-indexed)
- arrows reports line: 84 for the arrow on file line 84 (1-indexed)
- Additionally, nl uses the field name 'line' while warnings/find use 'row'. The naming is inconsistent across commands (though both nl and arrows use 'line').
- Reproducer file: /tmp/satsuma-test-nl/comprehensive.stm

