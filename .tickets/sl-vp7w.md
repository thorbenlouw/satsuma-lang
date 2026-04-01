---
id: sl-vp7w
status: open
deps: [sl-f1kt]
links: []
created: 2026-04-01T09:24:11Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-i34p
tags: [feature-29, viz, lsp, vscode]
---
# Feature 29 task: refactor LSP and VS Code to use shared viz backend

Refactor tooling/satsuma-lsp and the VS Code viz path to consume the shared viz backend package rather than owning a parallel implementation.

This task should keep protocol and editor-host responsibilities local while making the viz request path delegate to the shared backend.

PRD reference: features/29-viz-harness-and-shared-backend/PRD.md
TODO reference: features/29-viz-harness-and-shared-backend/TODO.md

## Acceptance Criteria

- tooling/satsuma-lsp answers viz-related custom requests by calling the shared viz backend package
- No separate LSP-only VizModel implementation remains in place for the same behaviour
- The VS Code visualization path continues to work with the shared backend-backed LSP requests
- Any build wiring affected by the extraction is updated and validated
- Relevant LSP and VS Code tests are updated to match the new package boundary


## Notes

**2026-04-01T10:30:21Z**

PR checkpoint prepared: LSP viz requests now delegate through the shared backend and VS Code viz integration was refactored into a tested host-side integration module. Verified vscode-satsuma build, unit tests, grammar tests, and LSP tests locally.
