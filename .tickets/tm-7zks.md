---
id: tm-7zks
status: open
deps: [tm-2ciy]
links: []
created: 2026-03-20T17:09:44Z
type: task
priority: 2
assignee: Thorben Louw
tags: [typescript-migration]
---
# Step 3: Convert core pipeline

Convert the core pipeline modules: extract.js (~484 lines, highest ROI), index-builder.js, workspace.js, parser.js (CJS interop via createRequire — cast to custom Parser interface).

## Acceptance Criteria

- extract.ts, index-builder.ts, workspace.ts, parser.ts converted
- parser.ts uses createRequire pattern with proper casts
- WorkspaceIndex type used throughout pipeline
- tsc passes, all tests pass

