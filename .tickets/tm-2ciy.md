---
id: tm-2ciy
status: closed
deps: [tm-56zz]
links: []
created: 2026-03-20T17:09:38Z
type: task
priority: 2
assignee: Thorben Louw
tags: [typescript-migration]
---
# Step 2: Convert standalone extractors

Convert extractor modules that import only leaves: nl-extract.js, meta-extract.js, cst-query.js, nl-ref-extract.js, spread-expand.js to .ts. These benefit from SyntaxNode parameter types.

## Acceptance Criteria

- nl-extract.ts, meta-extract.ts, cst-query.ts, nl-ref-extract.ts, spread-expand.ts converted
- Functions use SyntaxNode types from types.ts
- tsc passes, all tests pass

