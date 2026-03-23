---
id: sc-r9gv
status: closed
deps: []
links: []
created: 2026-03-22T21:30:57Z
type: bug
priority: 3
assignee: Thorben Louw
---
# schema: empty list_of record {} loses record type in output

When a list_of record field has an empty body, the schema command drops the record type.

Repro:
  Create file with: schema test { items list_of record { } id INT (pk) }
  satsuma schema test <file>

Expected: Shows 'items list_of record' or similar.
Actual: Shows 'items list_of ' (trailing space, no type). The --json output confirms type: '' (empty string).

The parser accepts this as valid syntax but the extractor cannot resolve the record type from an empty body.

