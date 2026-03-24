---
id: sl-yfg2
status: closed
deps: []
links: []
created: 2026-03-24T08:14:07Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, match-fields]
---
# match-fields does not recurse into nested records

The `match-fields` command only compares top-level field names between source and target schemas. When one schema has deeply nested records (e.g. ISO 20022 pacs.008 with GrpHdr, CdtTrfTxInf as top-level records), the nested fields are not considered for matching.

Repro:
```bash
satsuma match-fields --source pacs008 --target ledger_entry bug-hunt/
# Matched: 0, Source-only: 2, Target-only: 23
# Source-only: GrpHdr, CdtTrfTxInf (the two top-level records)
# But pacs008 has nested fields like IntrBkSttlmDt (could match value_date),
# Ccy (could match currency), IBAN, BIC, etc.
```

This makes match-fields nearly useless for XML, HL7, or any schema with nested records.

## Acceptance Criteria

1. Leaf fields inside nested records are included in name matching
2. Nested fields are presented with their full path or an indication of their nesting context
3. Name normalization still applies to nested field names
4. Works for multiple levels of nesting

