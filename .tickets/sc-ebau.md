---
id: sc-ebau
status: open
deps: []
links: []
created: 2026-03-22T21:31:00Z
type: bug
priority: 3
assignee: Thorben Louw
---
# graph --json: scalar list fields lose list_of type wrapper

In graph --json output, scalar list fields (list_of STRING, list_of INT) are reported with only their element type, not as lists.

Repro:
  satsuma graph examples/filter-flatten-governance.stm --json

Expected: promo_codes node has type 'list_of STRING' or similar list indicator.
Actual: promo_codes has type: 'STRING', tag_ids has type: 'INT'.

Structured list fields (list_of record) correctly show type: 'list' but scalar lists lose their list nature entirely. A graph consumer cannot distinguish a scalar field from a scalar list field.

