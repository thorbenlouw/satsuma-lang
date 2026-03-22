---
id: sl-gf8d
status: closed
deps: [sl-1ugo]
links: [sl-jt7q]
created: 2026-03-21T08:01:44Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fields, exploratory-testing]
---
# fields: --with-meta drops metadata tags from nested record/list child fields

When using `--with-meta --json`, fields inside `record` and `list` blocks have no `tags` array, even though they have metadata in the source.

**What I did:**
```bash
npx satsuma fields nested_order /tmp/satsuma-test-fields/nested.stm --with-meta --json
```

**Test fixture** (`/tmp/satsuma-test-fields/nested.stm`):
Schema `nested_order` has:
- `record customer { ... email STRING (pii) ... }`
- `list line_items { sku STRING (required) ... }`

**Expected:**
Nested child fields should include their metadata tags. E.g. `email` inside `customer` should have `tags: ["pii"]`, `sku` inside `line_items` should have `tags: ["required"]`.

**Actual output (children excerpt):**
```json
{"name": "email", "type": "STRING"}
{"name": "sku", "type": "STRING"}
```
No `tags` array on any nested child field. Top-level fields like `order_id (pk)` correctly get `tags: ["pk"]`.

**Reproducing fixture:** /tmp/satsuma-test-fields/nested.stm

