---
id: sl-s8xn
status: closed
deps: []
links: [sl-armj, sl-jt7q]
created: 2026-03-21T07:59:28Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, schema, exploratory-testing]
---
# schema: text and JSON output drops record/list block-level metadata (xpath)

When a `record` or `list` block inside a schema has metadata (e.g., xpath), the metadata is silently dropped from both text and JSON output.

**What I did:**
```bash
satsuma schema commerce_order examples/xml-to-parquet.stm
```

**Source file has:**
```
record Order (xpath "/ord:OrderMessage/ord:Order") {
  ...
  list Discounts (xpath "ord:Discounts/ord:Discount") {
  ...
  list LineItems (xpath "ord:LineItems/ord:LineItem") {
```

**Actual output shows:**
```
record Order {
  ...
  list Discounts {
  ...
  list LineItems {
```

All block-level metadata is dropped. In JSON output, the nested children objects have no metadata either.

**Reproducer:** `examples/xml-to-parquet.stm`, schema `commerce_order`.

