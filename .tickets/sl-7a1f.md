---
id: sl-7a1f
status: closed
deps: []
links: [sl-7i7j]
created: 2026-03-21T07:58:38Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate, exploratory-testing]
---
# validate: field-not-in-schema checks arrows against unrelated schemas in directory mode

When validating a directory with multiple files, the field-not-in-schema check evaluates arrow fields against all schemas in the workspace, not just the mapping's declared source/target schemas. This produces false-positive warnings for files that are individually valid.

**What I did:**
Created two valid files: valid-basic.stm (schema source_sys/target_sys + mapping) and undefined-schema-ref.stm (schema my_source + mapping referencing nonexistent_target). Ran:
  satsuma validate /tmp/satsuma-test-validate/crosscheck/

**Expected:** valid-basic.stm should have zero warnings since its mapping declares source/target and all arrow fields exist in those schemas.

**Actual:** valid-basic.stm gets warnings like:
  valid-basic.stm:20:1 warning [field-not-in-schema] Arrow source 'email' not declared in schema 'my_source'

The field 'email' is being checked against 'my_source' which is from a completely different file and not referenced in the mapping.

**Reproducer:** /tmp/satsuma-test-validate/crosscheck/


## Notes

**2026-03-22T00:37:19Z**

Added file-level filtering for anonymous mapping arrow validation to prevent cross-file false positives. Original reproducer may have been using anonymous mappings.
