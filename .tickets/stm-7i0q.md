---
id: stm-7i0q
status: open
deps: [stm-iohm]
links: []
created: 2026-03-18T16:52:43Z
type: task
priority: 2
assignee: Thorben Louw
parent: stm-u32p
tags: [cli, feature-10]
---
# Implement stm diff command

New command: stm diff <a> <b>. Structural comparison of two STM files or directories. Compares by building two WorkspaceIndex instances and diffing schemas (fields, types, metadata) and mappings (arrows, transforms).

## Acceptance Criteria

- [ ] Create src/diff.js: accepts two WorkspaceIndex instances, returns structured delta
- [ ] Compares schemas: added, removed, changed (field list or metadata differs)
- [ ] Compares fields: added, removed, type changed, metadata changed
- [ ] Compares mappings: added, removed, arrows changed
- [ ] Compares arrows: added, removed, transform text changed
- [ ] Default output: grouped by block, +/-/~ markers
- [ ] --json structured delta object
- [ ] --names-only lists changed block names only
- [ ] --stat summary counts
- [ ] Tests: identical files produce empty diff
- [ ] Tests: added/removed fields show +/-
- [ ] Tests: type change shows ~
- [ ] Tests: added/removed arrows in mappings
- [ ] Tests: directory-level diff aggregates across files

