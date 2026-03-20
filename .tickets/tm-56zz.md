---
id: tm-56zz
status: open
deps: [tm-752a]
links: []
created: 2026-03-20T17:09:29Z
type: task
priority: 1
assignee: Thorben Louw
tags: [typescript-migration]
---
# Step 1: Type foundations + leaf modules

Create src/types.ts with core interfaces (SyntaxNode, Tree, Parser, SchemaRecord, MetricRecord, MappingRecord, FragmentRecord, ArrowRecord, WorkspaceIndex, ParsedFile, LintDiagnostic, LintFix, LintRule, RegisterFn). Convert leaf modules: classify.js, normalize.js, errors.js, diff.js to .ts.

## Acceptance Criteria

- src/types.ts exists with all core interfaces
- classify.ts, normalize.ts, errors.ts, diff.ts converted with proper type annotations
- tsc passes with no errors
- All tests pass
- No runtime behavior changes

