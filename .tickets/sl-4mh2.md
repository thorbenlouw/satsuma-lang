---
id: sl-4mh2
status: closed
deps: [sl-1ugo]
links: [sl-jt7q]
created: 2026-03-21T08:01:53Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, fields, exploratory-testing]
---
# fields: --unmapped-by includes mapped children in partially-mapped record blocks

When a record block has both mapped and unmapped children, `--unmapped-by` lists the entire record with ALL children — including children that ARE mapped.

**What I did:**
```bash
npx satsuma fields nested_target /tmp/satsuma-test-fields/nested_mapping.stm --unmapped-by 'nested test' --json
```

**Test fixture** (`/tmp/satsuma-test-fields/nested_mapping.stm`):
Schema `nested_target` has `record details { name STRING(200), email STRING(255) }`.
Mapping `nested test` has arrow `name -> details.name`.
So `details.name` IS mapped, but `details.email` is NOT.

**Expected:**
Either:
(a) Only `details.email` listed as unmapped (not the whole record), or
(b) The record shown with only unmapped children (filtering out `name`)

**Actual output:**
```json
[
  {"name": "details", "type": "record", "isList": false, "children": [
    {"name": "name", "type": "STRING(200)"},
    {"name": "email", "type": "STRING(255)"}
  ]},
  {"name": "status", "type": "BOOLEAN"}
]
```
The mapped child `name` is included in the output, making it appear unmapped.

**Reproducing fixture:** /tmp/satsuma-test-fields/nested_mapping.stm


## Notes

**2026-03-22T02:00:00Z**

Cause: --unmapped-by treated entire record as mapped/unmapped without checking children.
Fix: Recurse into record/list children and exclude individually mapped leaf fields; normalize arrow paths by stripping [] brackets (commit cf955f7).
