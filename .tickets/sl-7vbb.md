---
id: sl-7vbb
status: open
deps: []
links: []
created: 2026-03-21T07:59:10Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# validate: ref metadata referencing nonexistent schema not checked

Validator does not check whether (ref schema.field) metadata references point to schemas and fields that actually exist. A ref pointing to a completely nonexistent table validates cleanly.

**What I did:**
Created a file with:
  vendor_id INT (ref nonexistent_table.id)
alongside a valid ref (ref customers.id) where 'customers' exists. Ran:
  satsuma validate /tmp/satsuma-test-validate/ref-check.stm

**Expected:** Warning about 'nonexistent_table' not being a known schema.

**Actual:** 'Validated 1 file: no issues found.' with exit code 0.

**Reproducer:** /tmp/satsuma-test-validate/ref-check.stm

