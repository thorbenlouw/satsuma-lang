---
id: sl-4x4q
status: closed
deps: []
links: []
created: 2026-03-23T09:55:26Z
type: task
priority: 2
assignee: Thorben Louw
tags: [feature-18, typescript]
---
# TS migration: infrastructure (tsconfig, build pipeline, test imports)

## Acceptance Criteria

tsconfig.json added. tsc compiles to dist/. Tests import from dist/ via package imports. npm test still passes (224 tests). npm run build produces JS + declarations + source maps.


## Notes

**2026-03-23T10:00:02Z**

Already complete. CLI is fully TypeScript with strict mode, noUncheckedIndexedAccess, dist/ output.
