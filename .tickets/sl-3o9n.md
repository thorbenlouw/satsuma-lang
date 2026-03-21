---
id: sl-3o9n
status: open
deps: []
links: [sl-xh3b]
created: 2026-03-21T08:02:10Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fields, exploratory-testing]
---
# fields: cannot list fields of a fragment

The `fields` command only searches for `schema` blocks, not `fragment` blocks. Fragments have the same field structure as schemas, so it would be useful to list their fields.

**What I did:**
```bash
npx satsuma fields audit_cols /tmp/satsuma-test-fields/fragments.stm
npx satsuma fields 'audit columns' examples/
npx satsuma fields 'address fields' examples/
```

**Expected:**
Fields of the fragment listed (e.g. `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`, `created_by VARCHAR(100)` for `audit_cols`).

**Actual output:**
```
Schema 'audit_cols' not found.
```
Exit code 1. The error message says "Schema" even though the user may have intended to look up a fragment.

Note: The help text says "List fields in a schema" so this may be by design, but fragments share schema_body grammar and it would be a natural extension.

**Reproducing fixture:** /tmp/satsuma-test-fields/fragments.stm

