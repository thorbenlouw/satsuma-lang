---
id: sl-f1kt
status: open
deps: []
links: []
created: 2026-04-01T09:24:11Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-i34p
tags: [feature-29, viz, backend, lsp]
---
# Feature 29 task: extract shared viz backend package

Extract the reusable VizModel production path out of tooling/satsuma-lsp into a new shared package under tooling/.

This task should move buildVizModel(), mergeVizModels(), and the viz-facing workspace/index logic needed for import-scoped and full-lineage model assembly into a consumer-neutral package that can be used by the LSP, the standalone harness, and future editor integrations.

PRD reference: features/29-viz-harness-and-shared-backend/PRD.md
TODO reference: features/29-viz-harness-and-shared-backend/TODO.md

## Acceptance Criteria

- A shared viz backend package exists under tooling/ and owns reusable VizModel production logic previously held in tooling/satsuma-lsp
- buildVizModel() and mergeVizModels() are provided by the shared package rather than by an LSP-only implementation
- The viz-facing workspace/index logic needed for model assembly is extracted or adapted into the shared package boundary
- Import-reachable scoping and full-lineage assembly remain behaviourally equivalent after extraction
- Shared backend tests cover the extracted package at its new boundary

