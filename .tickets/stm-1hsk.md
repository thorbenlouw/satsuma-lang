---
id: stm-1hsk
status: closed
deps: [stm-eq1n, stm-zy83]
links: [stm-7rz4]
created: 2026-03-19T07:17:13Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [validator, feature-13]
---
# Suppress field-not-in-schema for inferred convention fields

Data Vault convention fields (record_source, hub_customer_hk, load_date etc.) are inferred by metadata tokens and intentionally not declared in schema bodies. ~25 false-positive warnings in datavault examples when arrows target these fields.

## Acceptance Criteria

stm validate on datavault examples produces 0 false-positive warnings for convention-inferred fields. True-positive warnings for genuinely missing fields are still reported.

