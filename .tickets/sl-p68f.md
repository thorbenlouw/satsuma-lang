---
id: sl-p68f
status: closed
deps: [sl-4x4q]
links: []
created: 2026-03-23T09:55:26Z
type: task
priority: 2
assignee: Thorben Louw
tags: [feature-18, typescript]
---
# TS migration: leaf modules (types.ts, classify, normalize, errors, diff)

## Acceptance Criteria

types.ts created with shared interfaces. classify.ts, normalize.ts, errors.ts, diff.ts converted. tsc --strict passes. All 224 tests pass.


## Notes

**2026-03-23T10:00:02Z**

Already complete. CLI is fully TypeScript with strict mode, noUncheckedIndexedAccess, dist/ output.
