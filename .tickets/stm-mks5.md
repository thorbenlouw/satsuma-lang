---
id: stm-mks5
status: open
deps: []
links: []
created: 2026-03-18T20:07:43Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, bug, extraction]
---
# Source/target backtick-stripping bug breaks lineage, where-used, and validate

extractMappings stores source and target schema names with backtick delimiters intact (e.g. `legacy_sqlserver` instead of legacy_sqlserver). Since schemas are indexed without backticks, this causes: (1) lineage shows no downstream edges, (2) where-used finds no references for schemas used as source/target, (3) validate produces false undefined-ref warnings for all mapping source/target refs.

## Acceptance Criteria

- mapping.sources and mapping.targets contain unquoted schema names
- stm lineage --from crm_system examples/ shows downstream edges
- stm where-used analytics_db examples/ finds mapping references
- stm validate examples/ does not produce false undefined-ref warnings for backtick-quoted refs

