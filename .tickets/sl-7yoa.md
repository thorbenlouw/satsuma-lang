---
id: sl-7yoa
status: open
deps: []
links: []
created: 2026-03-21T08:00:27Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, where-used, exploratory-testing]
---
# where-used: ref metadata references (ref schema.field) not detected

When a schema is referenced via `(ref schema.field)` metadata on a field declaration, where-used does not detect this as a reference.

**What I did:**
```bash
satsuma where-used parent_table /tmp/satsuma-test-where-used/ref-metadata.stm
satsuma where-used sfdc_account /Users/thorben/dev/personal/satsuma-lang/examples/sfdc_to_snowflake.stm
```

In ref-metadata.stm, `parent_table` is referenced via `(ref parent_table.id)` in child_table.
In sfdc_to_snowflake.stm, `sfdc_account` is referenced via `(ref sfdc_account.Id)` in sfdc_opportunity.

**What I expected:**
The ref metadata should surface as a reference, e.g. 'Referenced via ref metadata in: child_table.parent_id'.

**What actually happened:**
```
No references to 'parent_table' found.
No references to 'sfdc_account' found.
```

The `ref` metadata is a structural cross-reference between schemas and is important for understanding data relationships. Related: sl-7vbb (validate doesn't check ref metadata either).

**Reproduction file:** /tmp/satsuma-test-where-used/ref-metadata.stm

