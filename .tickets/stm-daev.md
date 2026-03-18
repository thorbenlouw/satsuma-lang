---
id: stm-daev
status: closed
deps: [stm-iohm]
links: []
created: 2026-03-18T16:52:43Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u32p
tags: [cli, feature-10]
---
# Implement stm fields command with --unmapped-by

New command: stm fields <schema>. Lists fields with types. Key feature: --unmapped-by <mapping> does set-difference between declared fields and arrow target paths to find fields with no arrows.

## Acceptance Criteria

- [ ] Accepts <schema> argument
- [ ] Default output: field name, type, one per line
- [ ] --with-meta includes metadata tags inline
- [ ] --unmapped-by <mapping>: set-difference between schema's declared fields and mapping's arrow target paths
- [ ] Fields covered by derived arrows are NOT in the unmapped list
- [ ] --json structured field array
- [ ] Exit 1 if schema not found; exit 1 if mapping not found (for --unmapped-by)
- [ ] Tests: lists all fields with correct types
- [ ] Tests: --unmapped-by returns correct set difference
- [ ] Tests: derived arrow targets excluded from unmapped list

