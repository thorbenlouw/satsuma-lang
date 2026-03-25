---
id: cbh-mpz2
status: open
deps: []
links: []
created: 2026-03-25T11:16:27Z
type: bug
priority: 2
assignee: Thorben Louw
---
# summary vs schema --json: inconsistent field counts for nested/fragment schemas

DETAILED DESCRIPTION:
- Commands: satsuma summary /tmp/satsuma-bug-hunt/ --json vs satsuma schema shipping_order /tmp/satsuma-bug-hunt/ --json
- Expected: field counts should be consistent across commands, or the counting methodology should be clearly documented
- Actual: summary and schema --json use different counting methods:

  shipping_order:
    summary says: [19 fields] (counts every node recursively including record containers and all nested sub-fields)
    schema --json: returns 6 fields (top-level only: order_id, status, recipient, line_items, tracking_numbers, tag_ids)

  vendor_contact:
    summary says: [16 fields] (expands fragment spreads and counts all nested sub-fields recursively)
    schema --json: returns 10 fields (expanded fragments but address record counted as 1)

- The discrepancy means a consumer checking 'how many fields does this schema have?' gets different answers from summary vs schema --json. The summary uses recursive/leaf counting while schema --json uses top-level-only counting.
- Files: /tmp/satsuma-bug-hunt/schemas.stm (shipping_order line 22), /tmp/satsuma-bug-hunt/fragments.stm (vendor_contact line 35)

