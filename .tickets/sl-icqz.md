---
id: sl-icqz
status: open
deps: []
links: []
created: 2026-03-21T08:00:19Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# validate: mapping with only target declaration (no source) causes parse error

A mapping block that contains only a target declaration and derived arrows (no source) causes parse errors. Per the EBNF grammar, source_decl and target_decl are both optional members of mapping_body, so a target-only mapping should be valid for purely computed/derived field mappings.

**What I did:**
Created a file with a mapping containing only `target { \`computed_target\` }` and derived arrows like `-> id { uuid_v4() }`. Ran:
  satsuma validate /tmp/satsuma-test-validate/target-only-mapping.stm

Also tested without a label (derived-arrow.stm) - same result.

**Expected:** Valid parse since the grammar shows source_decl as optional in mapping_body.

**Actual:**
  target-only-mapping.stm:7:1 error [parse-error] Syntax error: unexpected 'mapping 'computed values' {...'
  2 errors, 0 warnings in 1 file
  Exit code: 2

**Reproducer:** /tmp/satsuma-test-validate/target-only-mapping.stm and /tmp/satsuma-test-validate/derived-arrow.stm

