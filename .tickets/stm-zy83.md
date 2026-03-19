---
id: stm-zy83
status: closed
deps: []
links: [stm-7rz4]
created: 2026-03-19T07:16:49Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [parser, feature-13]
---
# Support ref <schema> on <field> compound metadata syntax

The grammar's _metadata_entry rule supports key_value_pair but not 'ref dim_X on field' compound forms. This causes 6 parse errors in Kimball fact tables and Data Vault marts that declare dimension references.

## Acceptance Criteria

ref <schema> on <field> metadata syntax parses correctly. fact-sales.stm, fact-inventory.stm, mart-sales.stm parse without ref-on errors. stm meta output includes full 'ref dim_X on field' representation.

