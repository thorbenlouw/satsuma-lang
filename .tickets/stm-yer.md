---
id: stm-yer
status: closed
deps: []
links: []
created: 2026-03-13T15:58:54Z
type: task
priority: 2
---
# Write example .stm files for namespace + workspace feature

Create illustrative examples under features/02-multi-schema/examples/.

## Files
- crm/pipeline.stm: namespace crm, table orders, table customers
- billing/pipeline.stm: namespace billing, table orders (collision demo), table invoices
- warehouse/ingest.stm: namespace warehouse, cross-namespace map blocks
- platform.stm: workspace block assembling all three files
- namespace-basic.stm: minimal single-file namespace example

## Acceptance Criteria
- [ ] All files syntactically valid STM
- [ ] crm::orders and billing::orders demonstrate collision resolution
- [ ] Cross-namespace field reference in warehouse/ingest.stm
- [ ] platform.stm workspace references all three files


