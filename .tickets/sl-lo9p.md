---
id: sl-lo9p
status: closed
deps: []
links: []
created: 2026-03-24T08:15:49Z
type: bug
priority: 3
assignee: Thorben Louw
tags: [cli, meta, graph, fields]
---
# list_of record fields displayed as 'list_of list' in meta, graph, and fields output

Fields declared as `list_of record { ... }` are displayed as `list_of list` in multiple CLI commands. The correct display should be `list_of record` to match the source syntax.

Repro:
```bash
satsuma meta hl7_adt.IN1 bug-hunt/
# type: list_of list    ← should be 'list_of record'

satsuma meta fhir_patient.telecom bug-hunt/
# type: list_of list    ← should be 'list_of record'

satsuma graph bug-hunt/ --json
# hl7_adt node: {name: 'IN1', type: 'list_of list'}  ← same
```

This affects `meta`, `graph --json`, and `fields --json` (which shows `isList: true` but `type: 'list'`).

## Acceptance Criteria

1. `list_of record` fields display as type 'list_of record' (not 'list_of list')
2. Consistent across meta, graph, and fields commands
3. `list_of TYPE` (scalar lists) should display correctly too (e.g. 'list_of STRING')

## Notes

**2026-03-24T09:10:00Z**

Cause: `extractFieldTree` set `type: "list"` for `list_of record` fields instead of `type: "record"`. Downstream formatters then produced `"list_of list"` by combining `isList` with `type`.
Fix: Changed `type` to always be `"record"` for record/list_of record fields. The `isList` flag distinguishes them. Updated the sc-r9gv test expectation. (commit pending)

