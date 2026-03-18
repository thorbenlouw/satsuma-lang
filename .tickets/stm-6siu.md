---
id: stm-6siu
status: closed
deps: [stm-ohgr, stm-j51n]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 4: Schema and fragment blocks

Parse schema and fragment blocks. Shared schema_body with field_decl, record_block, list_block, fragment_spread, note_block. Test 3-level nesting. Add corpus test/corpus/schemas.txt and test/corpus/fragments.txt.

## Acceptance Criteria

- schema and fragment blocks parse correctly
- Nested record/list blocks work (3 levels)
- fragment_spread works
- test/corpus/schemas.txt and fragments.txt pass

