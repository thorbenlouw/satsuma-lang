---
id: tm-6lwq
status: closed
deps: [tm-spvh]
links: []
created: 2026-03-20T17:09:54Z
type: task
priority: 2
assignee: Thorben Louw
tags: [typescript-migration]
---
# Step 5: Convert commands + entry point

Convert all 19 command files in src/commands/ to .ts (uniform pattern: export function register(program: Command)). Convert src/index.js to src/index.ts. Remove allowJs: true from tsconfig.

## Acceptance Criteria

- All 19 command files converted to .ts
- index.ts converted with dynamic command imports cast properly
- allowJs removed from tsconfig
- tsc passes with no .js files remaining in src/
- All tests pass
- CLI works e2e

