---
id: stm-qjwm
status: closed
deps: []
links: []
created: 2026-03-18T21:29:30Z
type: bug
priority: 3
assignee: Thorben Louw
parent: stm-r58z
tags: [validator, cli, feature-12]
---
# Bug 4: Suppress field-not-in-schema for schemas with unresolved spreads

customer_360 schema includes ...audit fields (spread from imported lib/common.stm) which contributes created_at and updated_at. The validator does not resolve imports or expand spreads, so these fields are missing from the schema field set, producing 2 false warnings in multi-source-join.stm. Root cause: neither extract.js nor validate.js follows imports or expands template spreads.

## Acceptance Criteria

Schemas with unresolved fragment/template spreads do not produce false field-not-in-schema warnings for fields that could come from the spread. Either suppress the check for such schemas or emit a softer info-level unresolved-spread diagnostic. Test coverage added.

