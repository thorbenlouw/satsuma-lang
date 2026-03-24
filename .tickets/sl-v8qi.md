---
id: sl-v8qi
status: closed
deps: []
links: []
created: 2026-03-24T08:16:40Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, lint]
---
# lint --fix reports fixable findings but applies zero fixes

The `lint --fix` flag identifies fixable findings (2 `hidden-source-in-nl` warnings marked 'fixable') but does not apply any fixes. The JSON output shows `fixed: 0` even with `--fix` flag, and the fixes array is empty.

Repro:
```bash
satsuma lint bug-hunt/scenario-01-healthcare-hl7.stm --fix --json
# Output: {summary: {findings: 12, fixable: 2, fixed: 0}}
# The hidden-source-in-nl rule IS marked as fixable (yes) in SATSUMA-CLI.md
# Expected: The fix should add the referenced schema to the mapping's source/target list
```

The `hidden-source-in-nl` findings reference `fhir_patient.resource_id` and `fhir_patient.mrn` in the 'lab results to observations' mapping. The fix should add `fhir_patient` to the mapping's source list.

## Acceptance Criteria

1. `lint --fix` applies fixes for `hidden-source-in-nl` findings
2. The fix adds the referenced schema to the mapping's source/target declaration
3. JSON output shows `fixed > 0` and the fixes array contains the applied changes
4. File is modified in-place with the fix applied
5. Running lint again after fix shows the finding is resolved

