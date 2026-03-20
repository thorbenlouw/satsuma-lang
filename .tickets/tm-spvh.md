---
id: tm-spvh
status: closed
deps: [tm-7zks]
links: []
created: 2026-03-20T17:09:49Z
type: task
priority: 2
assignee: Thorben Louw
tags: [typescript-migration]
---
# Step 4: Convert validation and analysis

Convert validate.js, lint-engine.js, graph-builder.js to .ts. These depend on nl-ref-extract and index-builder.

## Acceptance Criteria

- validate.ts, lint-engine.ts, graph-builder.ts converted
- LintDiagnostic/LintRule types used in lint-engine
- tsc passes, all tests pass

