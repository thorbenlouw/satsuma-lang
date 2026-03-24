---
id: sl-dthn
status: closed
deps: []
links: []
created: 2026-03-24T08:13:02Z
type: bug
priority: 1
assignee: Thorben Louw
tags: [cli, lint, validate, nl-refs]
---
# NL ref resolver does not support dotted field paths for nested fields

When NL text contains backtick references with dotted paths to nested fields (e.g. `PID.DateOfBirth`, `MSH.SendingFacility`, `CdtTrfTxInf.PmtId.UETR`), the lint/validate `unresolved-nl-ref` rule reports them as 'does not resolve to any known identifier'. These ARE valid references — they point to fields inside nested records of the source/target schema.

This is extremely common in enterprise schemas with deep nesting (HL7, ISO 20022, XML). In scenario-03, 12 out of 12 warnings are false positives from dotted NL refs.

Examples:
- `PID.DateOfBirth` in mapping with source `hl7_adt` → PID is a record in hl7_adt, DateOfBirth is a field in PID
- `CdtTrfTxInf.PmtId.UETR` in mapping with source `pacs008` → 3-level nested path
- `MSH.SendingFacility` in mapping with source `lab_results`

Repro: `satsuma validate bug-hunt/scenario-03-payments-iso20022.stm` — all 12 warnings are this issue

## Acceptance Criteria

1. Dotted NL backtick refs that resolve to nested fields in source/target schemas are not flagged as unresolved
2. Still flags genuinely unresolved refs (e.g. `nonexistent.field`)
3. Works for 2-level (`PID.DateOfBirth`) and 3+ level (`CdtTrfTxInf.PmtId.UETR`) paths
4. Works for paths within list_of record fields


## Notes

**2026-03-24T09:05:00Z**

Cause: resolveRef only treated dotted refs as schema.field, not as nested field paths within source/target schemas.
Fix: Added hasNestedFieldPath with recursive search through nested record children. Dotted refs now resolve at any nesting depth. (commit pending)
