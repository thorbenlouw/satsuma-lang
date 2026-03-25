---
id: cbh-b0w8
status: open
deps: []
links: [cbh-ukcx, cbh-so1o, cbh-kyv3, cbh-2y8p, cbh-7ji8, cbh-9cqh, cbh-e01s]
created: 2026-03-25T11:16:05Z
type: bug
priority: 2
assignee: Thorben Louw
---
# summary: multi-line schema note breaks list formatting

DETAILED DESCRIPTION:
- Command: satsuma summary /tmp/satsuma-bug-hunt/
- Expected: customer_master with multi-line note should display compactly in the schema list, perhaps truncating the note to a single line
- Actual: The entire multi-line note (7 lines of markdown) is rendered inline between customer_master and xml_purchase_order, breaking the visual list alignment. Output shows:
  customer_master  [12 fields]  — # Customer Master Record
  
    The **canonical customer entity** across all systems.
  
    ## Data Quality
    - Deduplication runs nightly via MDM
    - Phone numbers normalized to E.164
    - Addresses validated via SmartyStreets API
  xml_purchase_order  [11 fields]
- The summary list is designed for a quick overview but the untruncated note disrupts readability
- File: /tmp/satsuma-bug-hunt/schemas.stm (customer_master schema, line 62)

