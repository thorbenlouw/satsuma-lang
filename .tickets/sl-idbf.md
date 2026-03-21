---
id: sl-idbf
status: open
deps: []
links: [sl-42ev, sl-7i7j]
created: 2026-03-21T07:58:43Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# validate: undefined fragment spread references not caught

Validator does not detect when a schema contains a spread referencing a fragment that does not exist. The file validates cleanly with exit code 0.

**What I did:**
Created a file with `...nonexistent_fragment` inside a schema body. Ran:
  satsuma validate /tmp/satsuma-test-validate/undefined-fragment-ref.stm

Also tested with a file containing both a valid spread (`...audit_fields`) and an invalid one (`...missing_fragment`) in:
  satsuma validate /tmp/satsuma-test-validate/only-fragment.stm

**Expected:** Warning or error about 'nonexistent_fragment' / 'missing_fragment' being undefined.

**Actual:** 'Validated 1 file: no issues found.' with exit code 0 in both cases.

**Reproducer:** /tmp/satsuma-test-validate/undefined-fragment-ref.stm and /tmp/satsuma-test-validate/only-fragment.stm

