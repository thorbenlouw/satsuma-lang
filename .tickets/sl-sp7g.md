---
id: sl-sp7g
status: closed
deps: [sl-95f9]
links: []
created: 2026-04-02T09:19:48Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-m2s6
---
# viz-model: narrow TransformInfo.kind to nl | map

Update satsuma-viz-model so TransformInfo.kind is narrowed from 'pipeline' | 'nl' | 'mixed' | 'map' to 'nl' | 'map'. Remove or repurpose TransformInfo.steps so all step content is NL text in the text field. This is a breaking change to the viz-model contract — all consumers (satsuma-viz, satsuma-lsp, satsuma-viz-backend) must be updated in their respective tickets.

## Acceptance Criteria

1. TransformInfo.kind type: 'nl' | 'map' only
2. pipeline and mixed variants removed from the union
3. TransformInfo.steps simplified — no step-type field, all content is NL text
4. satsuma-viz-model unit/contract tests updated
5. TypeScript compiles without errors in the viz-model package

