---
id: sl-t5k4
status: closed
deps: []
links: [sl-7i7j]
created: 2026-03-21T07:58:58Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# validate: undefined import name not caught

When an import statement names an identifier that does not exist in the imported file, the validator does not report any error. The import silently succeeds.

**What I did:**
Created a file with: import { totally_fake_name } from "valid-basic.stm"
valid-basic.stm defines schemas 'source_sys' and 'target_sys', not 'totally_fake_name'. Ran:
  satsuma validate /tmp/satsuma-test-validate/import-test/

**Expected:** Error or warning that 'totally_fake_name' is not exported by 'valid-basic.stm'.

**Actual:** 'Validated 2 files: no issues found.' with exit code 0.

**Reproducer:** /tmp/satsuma-test-validate/import-test/


## Notes

**2026-03-22T02:00:00Z**

Cause: Validator didn't check that imported names exist in target files.
Fix: Add undefined-import validation rule (commit 219d5cc).
