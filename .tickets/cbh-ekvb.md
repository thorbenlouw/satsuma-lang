---
id: cbh-ekvb
status: open
deps: []
links: [cbh-zdk3, sl-xj4p, cbh-n4vm]
created: 2026-03-25T11:17:27Z
type: bug
priority: 2
assignee: Thorben Louw
---
# arrows: header summary over-counts 'as target' when source and target field names match

When an arrow maps a field to a target with the same field name (e.g. 'email -> email' or 'phone -> phone' across different schemas), the summary header double-counts the arrow in both 'as source' and 'as target' buckets, inflating the target count.

- Exact command: satsuma arrows customer_master.email /tmp/satsuma-bug-hunt/
- Expected: '4 arrows (3 as source, 1 as target)' — the 'cross file test' arrow 'email -> email' maps customer_master.email (source) to vendor_contact.email (target), so customer_master.email is only a source here
- Actual: '4 arrows (3 as source, 2 as target)' — overcounts as target by 1

Also reproducible with:
- satsuma arrows customer_master.phone /tmp/satsuma-bug-hunt/
- Expected: '3 arrows (2 as source, 1 as target)'
- Actual: '3 arrows (2 as source, 2 as target)'

The bug occurs because the code matches on field name alone (e.g. 'email') without checking the schema prefix when determining if an arrow uses the field as target.
- Test file: /tmp/satsuma-bug-hunt/mappings.stm, /tmp/satsuma-bug-hunt/edge-cases.stm

