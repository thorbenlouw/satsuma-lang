---
id: tm-okoz
status: closed
deps: [tm-6lwq]
links: []
created: 2026-03-20T17:09:59Z
type: task
priority: 2
assignee: Thorben Louw
tags: [typescript-migration]
---
# Step 6: Hardening — strict type checks

Enable noImplicitAny: true and noUncheckedIndexedAccess: true in tsconfig. Fix all resulting type errors. Final e2e verification.

## Acceptance Criteria

- noImplicitAny: true enabled and passing
- noUncheckedIndexedAccess: true enabled and passing
- tsc --strict passes with zero errors
- All tests pass
- Full e2e verification with satsuma summary

