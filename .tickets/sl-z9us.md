---
id: sl-z9us
status: open
deps: []
links: []
created: 2026-03-21T08:01:37Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fields, exploratory-testing]
---
# fields: --with-meta drops metadata tags from fragment spread fields

When using `--with-meta`, fields inherited from fragment spreads lose their metadata tags.

**What I did:**
```bash
npx satsuma fields with_spreads /tmp/satsuma-test-fields/fragments.stm --with-meta --json
```

**Test fixture** (`/tmp/satsuma-test-fields/fragments.stm`):
Fragment `audit_cols` has `created_at TIMESTAMPTZ (required)` and `created_by VARCHAR(100) (required)`.
Fragment `contact_info` has `email STRING(255) (pii)`.
Schema `with_spreads` spreads both fragments.

**Expected:**
Fragment fields should retain their tags in the output. E.g. `created_at` should have `tags: ["required"]`, `email` should have `tags: ["pii"]`.

**Actual output:**
```json
{"name": "created_at", "type": "TIMESTAMPTZ", "fromFragment": "audit_cols"}
{"name": "email", "type": "STRING(255)", "fromFragment": "contact_info"}
```
No `tags` array on any fragment spread field. Direct fields like `id (pk)` correctly get `tags: ["pk"]`.

Same issue in text output: fragment spread fields show no metadata parenthetical.

**Reproducing fixture:** /tmp/satsuma-test-fields/fragments.stm

