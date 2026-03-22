---
id: sc-fosy
status: in_progress
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

