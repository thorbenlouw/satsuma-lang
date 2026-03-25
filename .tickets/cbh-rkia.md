---
id: cbh-rkia
status: open
deps: []
links: [cbh-5tvk, cbh-mpz2, cbh-5lzd]
created: 2026-03-25T11:18:41Z
type: bug
priority: 2
assignee: Thorben Louw
---
# context: fragment-spread fields missing from schema rendering

The context command does not include fields inherited via fragment spreads when rendering schemas, even though the graph command correctly resolves them.

- Exact command: satsuma context 'vendor' /tmp/satsuma-bug-hunt/
- Expected: vendor_contact schema should show all 10 fields including those from fragment spreads (pii contact: email, phone, mobile; address block: address record; audit fields: created_at, updated_at, created_by, updated_by)
- Actual: vendor_contact only shows 2 fields: vendor_id UUID, company VARCHAR(200). All 8 spread fields are missing.
- Same issue with minimal_contact: graph shows 4 fields (contact_id + 3 from pii contact spread), but context only shows 1 field (contact_id)
- The graph --json command correctly resolves these fields (vendor_contact: 10 fields, minimal_contact: 4 fields)
- This also affects relevance scoring: searching for 'pii' gives vendor_contact and minimal_contact scores of only 1, since the spread fields with (pii) metadata are not counted
- Test files: /tmp/satsuma-bug-hunt/fragments.stm (vendor_contact at line 36), /tmp/satsuma-bug-hunt/edge-cases.stm (minimal_contact at line 4)

