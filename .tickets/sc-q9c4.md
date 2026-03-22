---
id: sc-q9c4
status: open
deps: []
links: []
created: 2026-03-22T21:30:25Z
type: bug
priority: 2
assignee: Thorben Louw
---
# find --json: fieldType omitted for list_of record fields

When find --tag matches a list_of record field, the JSON entry has no fieldType property. Other field entries include fieldType (e.g. STRING(255)).

Repro:
  satsuma find --tag filter examples/filter-flatten-governance.stm --json

Expected: line_items entry includes fieldType (e.g. 'list_of record' or 'list').
Actual: No fieldType key at all for line_items and discount_lines entries. Text output also shows empty type column for these fields.

