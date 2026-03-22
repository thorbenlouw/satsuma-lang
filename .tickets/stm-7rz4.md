---
id: stm-7rz4
status: closed
deps: []
links: [stm-eq1n, stm-zy83, stm-r5qn, stm-1hsk, stm-9607, stm-bym9, stm-gde5, sg-yl8q]
created: 2026-03-19T07:17:40Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [feature-13]
---
# Feature 13: Data modelling CLI bugs

Fix parser and CLI bugs discovered when running stm commands against Feature 06 data-modelling examples. Currently 15 parse errors + 65 false-positive warnings. See features/13-data-modelling-cli-bugs/PRD.md.

## Acceptance Criteria

stm validate on both example_kimball/ and example_datavault/ directories produces 0 errors and 0 false-positive warnings. All existing examples/ validation not regressed.


## Notes

**2026-03-20T13:14:08Z**

Status update (2026-03-20): 6 of 8 original bugs fixed. Parser bugs 1-2 (triple-quoted strings, ref...on syntax), validator bug 4 (duplicate schema merging), and CLI bugs 7-8 (find --tag, meta truncation) all resolved. Kimball examples validate clean. Only stm-1hsk remains (23 convention-field false positives in datavault examples).
