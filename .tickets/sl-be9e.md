---
id: sl-be9e
status: closed
deps: [sl-f1kt, sl-vp7w]
links: []
created: 2026-04-01T09:25:59Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-i34p
tags: [feature-29, ci, release, vscode]
---
# Feature 29 task: update CI and release build wiring

Update CI and release build wiring so the refactored VS Code package path still builds correctly after Feature 29 changes the package graph under tooling/.

This task should update GitHub Actions and any supporting package scripts needed to keep the VS Code extension build and packaging flow valid after extracting the shared viz backend and adding the harness package. Playwright remains a local developer-machine workflow for this feature and must not be introduced as a CI requirement here.

PRD reference: features/29-viz-harness-and-shared-backend/PRD.md
TODO reference: features/29-viz-harness-and-shared-backend/TODO.md

## Acceptance Criteria

- .github/workflows/ci.yml is updated as needed so the refactored VS Code package path still builds and validates correctly
- .github/workflows/release.yml is updated as needed so the extension packaging path still succeeds after the package extraction
- Any package scripts affected by the new package graph are updated so CI and release use the correct build order
- docs/developer/CI-WORKFLOWS.md reflects any CI or release job changes introduced by the feature
- Playwright is explicitly kept out of CI for this feature; browser UI coverage remains a required local developer workflow

