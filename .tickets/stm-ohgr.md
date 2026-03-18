---
id: stm-ohgr
status: open
deps: [stm-j51n]
links: []
created: 2026-03-18T12:17:55Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-a07c
tags: [treesitter, parser]
---
# Phase 3: Metadata blocks

Parse ( ) metadata blocks shared by schemas, fields, mappings, arrows, and metrics. metadata_entry choices: tag_token, key_value_pair, enum_body, slice_body, note_tag. Handle multi-line metadata via extras. Add corpus test/corpus/metadata.txt.

## Acceptance Criteria

- All metadata entry types parse correctly
- Multi-line metadata blocks work
- test/corpus/metadata.txt passes

