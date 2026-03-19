---
id: sc-c09h
status: closed
deps: []
links: []
created: 2026-03-19T18:43:14Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [stm-cli, nl-refs]
---
# NL backtick reference extraction utility

Create a shared utility module that parses NL strings in transform bodies and extracts backtick-delimited references. Should classify each ref as schema-qualified (e.g. source::hr_employees), namespace-qualified (e.g. staging::stg_employees.department), or bare field name. This is the foundation for validate, lineage, where-used, arrows, and the new nl-refs subcommand.

## Acceptance Criteria

- Extracts all backtick refs from NL string nodes in transform bodies
- Classifies refs as: namespace-qualified schema, field, or bare identifier
- Resolves refs against the workspace index (schemas, fields, transforms)
- Returns structured results with source location (file, line, column)
- Unit tests covering: simple field refs, namespace::schema refs, namespace::schema.field refs, unresolvable refs, multiple refs in one string

