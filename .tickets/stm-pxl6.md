---
id: stm-pxl6
status: closed
deps: []
links: []
created: 2026-03-19T08:36:46Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [validate, cli]
---
# Validate: inferred Data Vault fields flagged as missing

stm validate flags inferred fields from Data Vault vocabulary tokens (hub, satellite, link) as not declared in the schema. Fields like record_source, load_date, load_end_date, and hash keys (*_hk) are automatically inferred from hub/satellite/link metadata and should not require explicit declaration. Affects ~20 false-positive warnings in feature 06 Data Vault examples.

## Acceptance Criteria

- record_source on hubs, satellites, and links is not flagged by field-not-in-schema
- Hash key fields (*_hk) inferred from hub/link metadata are not flagged
- load_date, load_end_date inferred from satellite metadata are not flagged
- Reproduce: `stm validate features/06-data-modelling-with-stm/example_datavault/hub-customer.stm` — record_source arrows should not warn
- Reproduce: `stm validate features/06-data-modelling-with-stm/example_datavault/mart-sales.stm` — link_sale_hk and link_sale.record_source should not warn


## Notes

**2026-03-19T08:38:13Z**

Duplicate of stm-1hsk — same bug (inferred DV fields flagged as missing). stm-1hsk is the canonical ticket with deps and epic link.
