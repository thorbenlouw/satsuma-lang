---
id: sl-bfue
status: open
deps: []
links: []
created: 2026-03-21T08:00:47Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, meta, exploratory-testing]
---
# meta: nested field paths (schema.record.field) not supported

When a schema has nested record/list blocks, there is no way to disambiguate fields that exist in multiple nested blocks. The meta command uses flat field name lookup (first match wins), so `schema.field` works but `schema.record.field` does not.

What I did:
  `satsuma meta nested_meta.address.street /tmp/satsuma-test-meta/all-metadata.stm`

Expected:
  Metadata for street field inside address record

Actual output:
  Field 'address.street' not found in schema 'nested_meta'.
  Exit code: 1

This means for schemas like commerce_order (xml-to-parquet.stm) where TaxAmount exists in both Totals and LineItems records, there is no way to query the correct one:
  `satsuma meta commerce_order.TaxAmount` returns the first match (Totals.TaxAmount)
  `satsuma meta commerce_order.Totals.TaxAmount` fails with not found
  `satsuma meta commerce_order.LineItems.TaxAmount` fails with not found

Root cause: meta.ts line 122-124 splits on the first dot only, treating everything after as a flat field name. The `findField` function searches recursively but matches on exact name, so 'address.street' (the full substring after the first dot) never matches a field named 'street'.

Fixture: /tmp/satsuma-test-meta/all-metadata.stm

