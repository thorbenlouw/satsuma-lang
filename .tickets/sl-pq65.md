---
id: sl-pq65
status: open
deps: []
links: []
created: 2026-03-21T07:59:23Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, schema, exploratory-testing]
---
# schema: text and JSON output drops non-note schema-level metadata (format, namespace)

When a schema has multiple metadata entries at the schema level, only the `note` entry is preserved in the output. Other metadata like `format`, `namespace`, and custom entries are silently dropped.

**What I did:**
```bash
satsuma schema commerce_order examples/xml-to-parquet.stm
```

**Expected output header:**
```
schema commerce_order  (format xml, namespace ord "http://example.com/commerce/order/v2", namespace com "http://example.com/common/v1", note "Canonical commerce order message") {
```

**Actual output header:**
```
schema commerce_order  (note "Canonical commerce order message") {
```

The `format xml` and both `namespace` entries are dropped. The JSON output similarly only has `"note": "Canonical commerce order message"` with no other schema-level metadata.

**Reproducer:** `examples/xml-to-parquet.stm`, schema `commerce_order`.

