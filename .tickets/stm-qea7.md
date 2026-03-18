---
id: stm-qea7
status: closed
deps: []
links: []
created: 2026-03-18T21:28:41Z
type: bug
priority: 1
assignee: Thorben Louw
parent: stm-r58z
tags: [validator, cli, feature-12]
---
# Bug 1: Resolve nested record/list field paths in field-not-in-schema

The field-not-in-schema check compares full dotted/bracketed arrow paths (e.g. BeginningOfMessage.DOCNUM, Order.Customer.Email, CartLines[].unit_price) against flat top-level field names only. It needs to walk into record/list children to resolve nested paths. Affects ~90 warnings across edi-to-json.stm, xml-to-parquet.stm, protobuf-to-parquet.stm. Root cause: extractDirectFields() in src/extract.js only collects immediate-level fields; validate.js builds srcNames/tgtNames from this flat list.

## Acceptance Criteria

Arrows with nested record/list paths validate against the nested field tree. stm validate on edi-to-json.stm, xml-to-parquet.stm, protobuf-to-parquet.stm produces no false field-not-in-schema warnings. Relative paths (.REFNUM) inside nested blocks are handled. Test coverage for nested path resolution added.

