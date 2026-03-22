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


## Notes

**2026-03-22T02:00:00Z**

Cause: Data Vault convention fields (record_source, hub_customer_hk, load_date) are inferred by metadata tokens but validator flagged them as missing (~25 false positives).
Fix: Added getConventionFields() to infer expected fields from schema metadata tokens (hub, link, satellite, dimension, fact) and suppress false-positive warnings (commit 816fab5).
