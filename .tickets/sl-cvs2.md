---
id: sl-cvs2
status: open
deps: []
links: []
created: 2026-04-07T09:42:54Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# tests: de-duplicate core vs CLI extraction tests

CLI extract.test.ts and classify.test.ts re-test core functions, violating ARCHITECTURE.md. Delete duplicates; keep only CLI-specific edge cases. Feature 29 TODO #11.

## Acceptance Criteria

No overlap between core and CLI extraction/classification test cases.

