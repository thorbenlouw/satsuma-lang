---
id: stm-r5qn
status: closed
deps: [stm-eq1n, stm-zy83]
links: [stm-7rz4]
created: 2026-03-19T07:17:03Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [validator, feature-13]
---
# Fix duplicate schema field merging in workspace validation

When a source schema (e.g. pos_oracle) is declared in multiple files with different field subsets, workspace validation picks one declaration and flags fields from the other as missing. Produces ~28 false-positive warnings in Kimball examples.

## Acceptance Criteria

stm validate on the Kimball example directory produces 0 false-positive field-not-in-schema warnings for schemas declared in multiple files. Single-file validation is not regressed.

