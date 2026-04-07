---
id: sl-cvs2
status: closed
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


## Notes

**2026-04-07T14:53:14Z**

Cause: satsuma-cli/test/extract.test.ts and classify.test.ts re-tested core extraction/classification APIs using mock CST nodes — duplicating coverage already in core and violating ARCHITECTURE.md.
Fix: Migrated all mock-based cases into satsuma-core/test/extract.test.js as a clearly-labelled appendix; deleted classify.test.ts; trimmed satsuma-cli/test/extract.test.ts to its real-file integration suite; updated ARCHITECTURE.md to remove the 'Known violation' note.
