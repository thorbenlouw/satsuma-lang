---
id: sl-wrhz
status: closed
deps: []
links: []
created: 2026-04-07T17:33:51Z
type: chore
priority: 3
assignee: Thorben Louw
---
# docs: consolidate tooling architecture docs

Make docs/developer/ARCHITECTURE.md the canonical tooling architecture reference, reduce tooling/ARCHITECTURE.md to a pointer, and update incoming references such as README.md.

## Acceptance Criteria

docs/developer/ARCHITECTURE.md is the canonical architecture doc; tooling/ARCHITECTURE.md no longer duplicates architecture content; README/HOW-DO-I references point at the canonical doc.

## Notes

**2026-04-07T17:34:42Z**

Cause: tooling/ARCHITECTURE.md and docs/developer/ARCHITECTURE.md duplicated overlapping package maps, dependency rules, and architecture guidance, making the canonical source unclear. Fix: made docs/developer/ARCHITECTURE.md the canonical architecture reference, moved the useful principles/matrix there, reduced tooling/ARCHITECTURE.md to a pointer, and added a README link to the canonical doc (commit b1c4076).
