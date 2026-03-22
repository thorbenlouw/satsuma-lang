---
id: sl-z6z9
status: closed
deps: [sl-idbf]
links: [sl-42ev]
created: 2026-03-21T07:59:05Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, find, exploratory-testing]
---
# find: does not find tagged fields from fragment spreads in the consuming schema

When a schema uses `...fragment_name` to spread a fragment's fields, `satsuma find --tag` does not surface the fragment's tagged fields as belonging to the consuming schema. The fragment fields are only found under the fragment itself, not in schemas that spread it.

**What I did:**
Given this fixture (/tmp/satsuma-test-find/diverse-tags.stm):
```
fragment reusable_fields {
  created_at      TIMESTAMP   (required)
  updated_at      TIMESTAMP
  is_deleted      BOOLEAN     (default false)
  audit_note      STRING      (note "For compliance tracking")
}

schema uses_fragment {
  id              INT         (pk)
  ...reusable_fields
  name            STRING      (required)
}
```

```
satsuma find --tag default --in schema /tmp/satsuma-test-find/
```

**What I expected:**
`uses_fragment.is_deleted` should appear in results since the schema includes `...reusable_fields` which contains a field with `(default false)`.

**What actually happened:**
```
schema tag_test  (/tmp/satsuma-test-find/diverse-tags.stm)
  role                    [default]  line 9
schema third_schema  (/tmp/satsuma-test-find/second-file.stm)
  priority                [default]  line 11
```

The `is_deleted` field from `reusable_fields` is not shown under `uses_fragment`. It only appears when searching with `--in fragment` or `--in all`.

This means a PII audit (`satsuma find --tag pii`) could miss tagged fields that enter a schema via a fragment spread — a significant gap for compliance workflows.

**Test fixture:** /tmp/satsuma-test-find/diverse-tags.stm


## Notes

**2026-03-22T01:19:16Z**

Fixed by resolving fragment spreads in searchTag and searching fragment CST bodies for matching tagged fields, reporting them under the consuming schema. Added 2 integration tests.
