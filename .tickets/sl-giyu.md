---
id: sl-giyu
status: open
deps: []
links: []
created: 2026-04-07T09:42:54Z
type: chore
priority: 2
assignee: Thorben Louw
parent: sl-63ix
---
# docs: inline 'why' comments for complex algorithms

Add intent-level comments to: resolveRef (NL ref cascade), spread expander, viz-model.ts extract* builders, diff.ts comparators, index-builder.ts buildIndex. Feature 29 TODO #8.

## Acceptance Criteria

Each named function has a doc-comment explaining intent and precedence rules beyond what the signature shows.

