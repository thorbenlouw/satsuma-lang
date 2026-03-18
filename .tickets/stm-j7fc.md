---
id: stm-j7fc
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
# Implement stm arrows command

New command: stm arrows <schema.field>. Returns all arrows involving a field (as source or target) with transform classification. The most important new primitive — agents use it for impact tracing, coverage, and audit.

## Acceptance Criteria

- [ ] Accepts <schema.field> argument, parses into schema + field
- [ ] Returns all arrows involving the field from all mappings
- [ ] Each arrow shows: mapping name, src -> tgt, transform text, [classification]
- [ ] --as-source filters to arrows where field is source
- [ ] --as-target filters to arrows where field is target
- [ ] --json output includes decomposed pipe steps array
- [ ] --json includes file and line for each arrow
- [ ] Exit 1 if schema or field not found
- [ ] Registered in src/index.js
- [ ] Tests: structural, nl, mixed transforms show correct classification
- [ ] Tests: --as-source and --as-target filter correctly
- [ ] Tests: --json includes decomposed steps

