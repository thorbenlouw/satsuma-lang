---
id: sl-bhpv
status: closed
deps: []
links: [sl-7i7j]
created: 2026-03-21T07:58:54Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# validate: missing import file warning not included in diagnostics

When an import statement references a file that does not exist, the validator prints a warning to stderr but does not include it in the structured diagnostics. The exit code is 0 and --json output is an empty array.

**What I did:**
Created a file importing from 'nonexistent_file.stm'. Ran:
  satsuma validate /tmp/satsuma-test-validate/missing-import-file.stm --json

**Expected:** A diagnostic entry in the JSON output with severity 'error' or 'warning' for the missing import file, and exit code 2.

**Actual:**
stderr: warning: import target "nonexistent_file.stm" not found (referenced from /tmp/satsuma-test-validate/missing-import-file.stm:2)
stdout (JSON): []
exit code: 0

The warning is printed to stderr outside the diagnostics system, so it is invisible to JSON consumers.

**Reproducer:** /tmp/satsuma-test-validate/missing-import-file.stm


## Notes

**2026-03-22T02:00:00Z**

Cause: Validator didn't check whether import target files exist on disk.
Fix: Emit missing-import warning when an import target file does not exist (commit 076a756).
