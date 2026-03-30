---
id: sl-ax50
status: open
deps: []
links: []
created: 2026-03-30T06:38:25Z
type: chore
priority: 2
assignee: Thorben Louw
---
# validate.ts: extract and document Data Vault / Kimball convention rules in getConventionFields()

tooling/satsuma-cli/src/validate.ts lines 28-83: getConventionFields() is a 58-line function containing hardcoded Data Vault and Kimball dimensional modelling field naming rules (hub keys, satellite dates, dimension surrogate keys, fact grain columns, etc.).

These are domain rules, not implementation details. They are currently buried as anonymous string patterns with terse inline labels. Problems:
- No citation of the Data Vault or Kimball specs these rules derive from
- A reader cannot tell if the list is complete or approximate
- The rules cannot be overridden, extended, or audited without reading the function
- The function mixes rule definition (what the convention says) with rule application (how to check it) in one body

## Acceptance Criteria

- Each convention group (Data Vault hub, Data Vault satellite, Kimball dimension, Kimball fact) is clearly labelled with a comment that names the convention and ideally cites a source or notes the rationale
- Field name patterns are extracted to named constants or a structured data object so the rules can be read as a table, not decoded from scattered conditionals
- The function has a doc-comment explaining its role: given a schema type and convention, return the expected field names — and noting that the lists are opinionated approximations, not a full spec implementation
- All existing validate tests pass

