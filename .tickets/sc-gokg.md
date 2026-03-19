---
id: sc-gokg
status: closed
deps: [sc-c09h]
links: [sc-81p5, sc-mbc5, sc-aij8, sc-akx6, sc-jais]
created: 2026-03-19T18:43:22Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [stm-cli, validate, nl-refs]
---
# stm validate: warn on invalid NL backtick references

Extend stm validate to check backtick references inside NL transform bodies. Warn when: (1) a backtick ref cannot be resolved to any known schema, field, or transform in the workspace, (2) a schema ref in an NL block is not declared in the mapping's source or target list.

## Acceptance Criteria

- Warns on backtick refs that don't resolve to any known identifier
- Warns when an NL block references a schema not in the mapping's source/target list
- Does not error on bare field names that match a field in any declared source/target
- Warnings include file, line, and the unresolved reference
- Existing validate tests still pass
- New tests for: valid refs (no warning), unresolvable refs, schema not in source list

