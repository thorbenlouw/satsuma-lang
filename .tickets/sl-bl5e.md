---
id: sl-bl5e
status: done
deps: []
links: [sl-n464, sl-j1eb]
created: 2026-03-20T18:41:12Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, graph, bug]
---
# graph --json produces double-dot paths for nested record/list field arrows

In graph --json output, arrows referencing nested record or list fields produce paths with double-dot separators like 'cobol_customer_master..PHONE_TYPE' and 'mfcs_purchase_order..description' instead of proper dotted paths. These come from nested field paths (e.g., PHONE_NUMBERS[].PHONE_TYPE in cobol-to-avro.stm, items[].description in sap-po-to-mfcs.stm). The missing parent segment between the dots suggests the path builder drops the intermediate record/list name.

## Acceptance Criteria

1. 'satsuma graph examples/ --json' has no edges with '..' in from or to fields.
2. Nested field paths include the intermediate record/list name (e.g., 'schema.record.field').

