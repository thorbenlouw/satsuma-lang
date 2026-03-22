---
id: sc-8g9a
status: closed
deps: []
links: []
created: 2026-03-22T21:30:09Z
type: bug
priority: 1
assignee: Thorben Louw
---
# validate: false-positive field-not-in-schema warnings on flatten arrow targets

The validate command emits incorrect field-not-in-schema warnings for arrows inside flatten blocks.

Repro:
  satsuma validate examples/filter-flatten-governance.stm

Expected: No warnings for flatten inner arrows — the target fields (line_number, sku, quantity, etc.) all exist in order_line_facts_parquet.
Actual:
  warning [field-not-in-schema] Arrow target 'order_line_facts_parquet' not declared in schema 'order_line_facts_parquet'
  warning [field-not-in-schema] Arrow target 'order_line_facts_parquet.line_number' not declared in schema 'order_line_facts_parquet'
  warning [field-not-in-schema] Arrow target 'order_line_facts_parquet.sku' not declared in schema 'order_line_facts_parquet'
  ...

The validator appears to prepend the schema name to the field name (creating order_line_facts_parquet.line_number) and then fails to match it (the schema declares just line_number). This fires on the canonical example file.


## Notes

**2026-03-22T22:11:20Z**

Cause: resolveFieldPath() required multi-schema mapping (length>1) to strip schema qualifier, and never matched schema-name container targets. Fix: removed length>1 guard, added schema-name-equals-target check.
