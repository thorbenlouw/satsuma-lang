---
id: sc-5j7y
status: closed
deps: []
links: []
created: 2026-03-22T21:30:37Z
type: bug
priority: 2
assignee: Thorben Louw
---
# meta: does not indicate isList for scalar list fields

The meta command shows no list indicator for scalar list fields (list_of STRING, list_of INT).

Repro:
  satsuma meta order_events.promo_codes examples/filter-flatten-governance.stm --json

Expected: type shows 'list_of STRING' or includes an isList property.
Actual: type: 'STRING' with no list indicator.

The schema --json and fields --json commands correctly include isList: true for these fields, but meta does not.

