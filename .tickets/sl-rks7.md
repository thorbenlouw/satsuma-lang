---
id: sl-rks7
status: closed
deps: []
links: [sl-x11k]
created: 2026-03-21T08:01:03Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# validate: --errors-only suppresses semantic errors, not just warnings

The --errors-only flag is supposed to suppress warnings while keeping errors, but it also suppresses semantic errors like duplicate-definition. Only parse-error diagnostics survive the filter.

**What I did:**
Created a file with duplicate schema names (severity: error). Ran:
  satsuma validate /tmp/satsuma-test-validate/duplicate-schemas.stm --errors-only

**Expected:** The duplicate-definition error should still appear since it has severity 'error'.

**Actual:** 'Validated 1 file: no issues found.' with exit code 0.

Comparison:
  Without --errors-only: '1 error, 0 warnings in 1 file' (duplicate-definition shown)
  With --errors-only: 'Validated 1 file: no issues found.' (all diagnostics gone)
  With --errors-only --json: [] (empty array)

Parse errors (parse-error rule) DO survive --errors-only. Only semantic errors are incorrectly suppressed.

**Reproducer:** /tmp/satsuma-test-validate/duplicate-schemas.stm

