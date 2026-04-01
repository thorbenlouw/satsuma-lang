---
id: sl-3fs7
status: open
deps: []
links: []
created: 2026-04-01T07:16:26Z
type: task
priority: 2
assignee: Thorben Louw
tags: [refactor, maintainability]
---
# commands/graph.ts is too large (701 lines) and should be split

graph.ts currently handles all of the following in a single file:

- CLI command registration and option parsing
- Workspace graph assembly (buildWorkspaceGraph)
- Schema edge extraction (buildSchemaEdges)
- NL @ref schema extraction (extractNlSchemaRefs)
- Field edge building (buildFieldEdges, ~150 lines with nested deduplication logic)
- Field path qualification (qualifyField)
- Three output formatters (printDefault, printCompact, plus inline JSON)

**Suggested split:**

- Keep CLI registration and option handling in `commands/graph.ts`
- Move graph assembly and edge building into `graph-builder.ts` (or extend the existing one)
- Move the formatters into a `graph-format.ts`

This would make each piece independently testable and easier to navigate.

