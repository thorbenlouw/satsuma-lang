---
id: stm-7xw7
status: closed
deps: []
links: []
created: 2026-03-18T18:56:55Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-q2cz
tags: [parser, tree-sitter, paths, mapping]
---
# Extend mapping metadata and path grammar for flattened and repeated paths

Support mapping-level metadata such as flatten/group_by and path expressions with [] on intermediate segments.

## Acceptance Criteria

Corpus tests cover flatten `Order.LineItems[]`, group_by/on_error/error_threshold metadata, and paths such as Order.LineItems[].SKU, CartLines[].unit_price, and ShipmentHeader.asnDetails[].containers.
The grammar parses examples/xml-to-parquet.stm, examples/protobuf-to-parquet.stm, and examples/edi-to-json.stm without recovery errors from those constructs.

