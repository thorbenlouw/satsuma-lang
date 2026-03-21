---
id: sl-1ugo
status: closed
deps: []
links: [sl-jt7q]
created: 2026-03-21T08:02:01Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fields, exploratory-testing]
---
# fields: text output does not show nested record/list children

The text output for `fields` shows `record` and `list` blocks as flat entries without their children. Only the JSON output reveals the nested field hierarchy.

**What I did:**
```bash
npx satsuma fields nested_order /tmp/satsuma-test-fields/nested.stm
```

**Actual output:**
```
  order_id    STRING
  total       DECIMAL(12,2)
  customer    record
  line_items  list
```

**Expected:**
Children of record/list blocks should be visible in text output with indentation, e.g.:
```
  order_id    STRING
  total       DECIMAL(12,2)
  customer    record
    id           STRING
    email        STRING   (pii)
    preferences  record
      language     STRING
      timezone     STRING
  line_items  list
    sku          STRING   (required)
    quantity     INT
    ...
```

The JSON output correctly includes nested children. This makes the text output lossy — the `commerce_order` schema shows only `Order record` but actually has 30 nested fields.

**Reproducing fixture:** /tmp/satsuma-test-fields/nested.stm

