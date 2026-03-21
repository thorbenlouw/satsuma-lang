---
id: sl-giss
status: closed
deps: []
links: [sl-jt7q]
created: 2026-03-21T08:00:28Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, meta, exploratory-testing]
---
# meta: drops metadata on record/list blocks

When querying metadata for a record or list block inside a schema, `satsuma meta` returns empty entries even when the block has metadata.

What I did:
  `satsuma meta nested_meta.address /tmp/satsuma-test-meta/all-metadata.stm`

The fixture defines:
  record address (note "Nested record metadata") { ... }

Expected:
  Metadata showing note: Nested record metadata

Actual output:
  Metadata for 'nested_meta.address':
    type: record
    (no metadata)

Same issue with list blocks:
  `satsuma meta nested_meta.items /tmp/satsuma-test-meta/all-metadata.stm`
  Returns (no metadata) despite `list items (note "List of items")` in the source.

Also confirmed with real examples:
  `satsuma meta commerce_order.Order examples/xml-to-parquet.stm`
  Returns (no metadata) despite `(xpath "/ord:OrderMessage/ord:Order")` in the source.

Root cause: `findFieldDecls` in meta.ts (line 182-194) only matches `field_decl` CST nodes. Record/list blocks are `record_block`/`list_block` nodes and are never matched — the function recurses into them to find child fields but never matches metadata on the block itself.

Fixture: /tmp/satsuma-test-meta/all-metadata.stm

