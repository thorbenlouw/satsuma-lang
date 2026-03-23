---
id: sl-dvhm
status: closed
deps: []
links: []
created: 2026-03-22T07:45:32Z
type: bug
priority: 2
assignee: Thorben Louw
parent: sl-64yy
tags: [cli, arrows, exploratory-testing-2]
---
# arrows: text header shows 0 arrows for nested field paths

When looking up arrows for a nested (dot-separated) field path, the text output summary header always shows "0 arrows ()" even though arrows ARE rendered below the header. JSON output returns the correct count.

## Reproduction

Run: `satsuma arrows commerce_order.Order.Customer.Email examples/xml-to-parquet.stm`

Expected header: `commerce_order.Order.Customer.Email -- 1 arrow (1 as source)`
Actual header: `commerce_order.Order.Customer.Email -- 0 arrows ()`

The arrow itself is correctly displayed below the header. Flat (non-nested) field paths like `sfdc_opportunity.Id` show the correct count in the header.

## Root cause

The count calculation in commands/arrows.ts likely filters on exact field name match rather than the resolved nested path.

