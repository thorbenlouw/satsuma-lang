---
id: sl-xr1r
status: closed
deps: []
links: []
created: 2026-04-07T09:43:10Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# tests: grow grammar recovery corpus

Only 6 recovery cases today. Add cases for cursor mid-token, partial arrow, half-typed field, broken import, unterminated metadata string. Feature 29 TODO #13.

## Acceptance Criteria

recovery.txt has ≥15 cases covering mid-edit states.


## Notes

**2026-04-07T16:08:41Z**

Cause: The recovery corpus only covered 6 malformed-input cases, leaving common LSP mid-edit states like partial arrows, broken imports, and unterminated metadata strings unpinned. Fix: Added 9 parser corpus recovery cases covering mid-token input, partial arrows, half-typed fields, broken imports, unterminated metadata strings, and half-typed map entries; recovery.txt now has 15 cases. (commit 2a0bdc0)
