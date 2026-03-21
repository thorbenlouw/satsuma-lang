---
id: sl-u2qa
status: closed
deps: []
links: [sl-xh3b]
created: 2026-03-21T07:59:20Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, match-fields, exploratory-testing]
---
# match-fields: normalization does not strip spaces from backtick-quoted field names

The normalizeName function in normalize.ts uses regex /[_-]/g to strip separators, but does not strip spaces. This means backtick-quoted field names containing spaces (e.g. `Field With Spaces`) do not match equivalent snake_case or underscore-separated names (e.g. field_with_spaces).

What I did:
  satsuma match-fields --source backtick_source --target backtick_target /tmp/satsuma-test-match-fields/backtick-fields.stm

What I expected:
  `Field With Spaces` should match field_with_spaces since both normalize to 'fieldwithspaces' when spaces are treated as separators like underscores and hyphens.

What actually happened:
  `Field With Spaces` appears in sourceOnly and field_with_spaces appears in targetOnly — they are not matched. The normalization produces 'field with spaces' (spaces kept) vs 'fieldwithspaces' (underscores stripped).

Root cause: normalize.ts line 15: return name.toLowerCase().replace(/[_-]/g, '') should also strip spaces: /[_\- ]/g

Reproducer: /tmp/satsuma-test-match-fields/backtick-fields.stm

