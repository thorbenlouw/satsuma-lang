---
id: sl-a8je
status: open
deps: []
links: []
created: 2026-04-07T09:42:54Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-63ix
---
# tests: add direct unit tests for viz-model.ts

viz-model.ts (1370 lines) has no dedicated unit tests. Add tests for each top-level extract* builder against parsed CST input. Replace 'as unknown as CommentEntry[]' cast. Feature 29 TODO #10.

## Acceptance Criteria

Each top-level extract* builder has direct tests asserting VizModel shape via deepStrictEqual. Cast removed.

