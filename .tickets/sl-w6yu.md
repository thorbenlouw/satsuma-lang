---
id: sl-w6yu
status: open
deps: []
links: [sl-7i7j]
created: 2026-03-21T07:59:06Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# validate: unclosed schema at end of file not reported as parse error

When a file ends with an unclosed schema block (missing closing brace), the validator reports no parse errors and validates cleanly. The tree-sitter error recovery appears to mask the error.

**What I did:**
Created two test files:
1. partial-parse.stm - one valid schema followed by schema broken_one with no closing brace
2. multiple-errors.stm - valid schema, mapping to missing target, schema with bad spread, and schema with no closing brace

Ran:
  satsuma validate /tmp/satsuma-test-validate/partial-parse.stm
  satsuma validate /tmp/satsuma-test-validate/multiple-errors.stm

**Expected (partial-parse.stm):** At least one parse error for the unclosed schema.
**Actual:** 'Validated 1 file: no issues found.' with exit code 0.

**Expected (multiple-errors.stm):** Parse error for the unclosed schema at end of file, plus the undefined fragment spread warning.
**Actual:** Only 2 warnings (undefined-ref for missing_target, field-not-in-schema for 'fake'). No parse error and no undefined fragment warning. Exit code 0.

The tree-sitter parser likely recovers from the missing brace gracefully (treating the fields as part of the previous schema or silently closing it), so the CST has no ERROR nodes. The validator should still detect this case.

**Reproducer:** /tmp/satsuma-test-validate/partial-parse.stm and /tmp/satsuma-test-validate/multiple-errors.stm


## Notes

**2026-03-22T02:09:28Z**

Blocked: requires tree-sitter grammar changes. C++ compiler is unavailable in sandbox.
