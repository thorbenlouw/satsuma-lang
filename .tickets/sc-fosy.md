---
id: sc-fosy
status: closed
deps: [sc-xnhw]
links: []
created: 2026-03-22T20:17:39Z
type: task
priority: 1
assignee: Thorben Louw
parent: sc-v2pn
tags: [docs, spec]
---
# Update SATSUMA-V2-SPEC.md for unified syntax

Update reserved keywords (remove list, add list_of/each/flatten). Rewrite sections 3.1-3.3 for unified field declarations. Update mapping sections for each/flatten. Update all inline examples. Verify no old syntax references remain.

## Acceptance Criteria

Spec is internally consistent. grep for old patterns ('^  record ', '^  list ', '\[\]') returns zero hits.


## Notes

**2026-03-22T21:12:26Z**

**2026-03-23T00:10:00Z**

Cause: Spec used keyword-first record/list blocks and [] path syntax.
Fix: Rewrote sections 3.3, 4.4, 4.6, 8.2, 8.3 for unified NAME TYPE pattern. Updated reserved keywords (removed list, added list_of/each/flatten). Replaced all [] paths with dot-only syntax and each/flatten blocks. (commit be0907f)
