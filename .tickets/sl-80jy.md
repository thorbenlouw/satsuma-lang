---
id: sl-80jy
status: open
deps: []
links: [sl-04pv]
created: 2026-03-20T18:41:29Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint, bug]
---
# unresolved-nl-ref false positive on valid dotted-field backtick references

The unresolved-nl-ref lint rule fires on backtick references like `hidden.code` where 'hidden' is a defined schema and 'code' is a field in that schema. The dotted-field form should resolve against known schema.field pairs. This was observed when both the schema and field exist in the same workspace. Related to sl-04pv (hidden-source-in-nl never firing) — it appears the dotted-field resolution logic does not look up the schema prefix to find the field.

## Acceptance Criteria

1. `schema.field` backtick references where both schema and field exist do not trigger unresolved-nl-ref.
2. Truly unresolved references (nonexistent schema or field) still trigger the rule.

