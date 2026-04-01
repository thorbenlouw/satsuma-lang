---
id: sl-66hf
status: closed
deps: [sl-f1kt, sl-vp7w, sl-2jq2, sl-22fg, sl-be9e]
links: []
created: 2026-04-01T09:24:11Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-i34p
tags: [feature-29, docs, architecture]
---
# Feature 29 task: update README and architecture docs

Update top-level and architecture documentation so the implemented package map, data flow, local Playwright workflow, and CI/release workflow changes match Feature 29.

This task must update README.md, tooling/ARCHITECTURE.md, docs/developer/ARCHITECTURE.md, and any affected package-level README files. CI workflow documentation is tracked separately in sl-be9e and should be consistent with this task's architecture and workflow descriptions.

PRD reference: features/29-viz-harness-and-shared-backend/PRD.md
TODO reference: features/29-viz-harness-and-shared-backend/TODO.md

## Acceptance Criteria

- README.md describes the modular viz architecture at a high level, including the standalone harness and how to run browser-based viz tests
- tooling/ARCHITECTURE.md reflects the new package boundaries and dependency direction after the shared viz backend extraction and harness addition
- docs/developer/ARCHITECTURE.md reflects the final detailed package map and data flow
- README and package-level docs make clear that Playwright is a local developer-machine workflow for this feature, not a CI requirement
- Any affected package-level README files are updated so contributors can tell where viz rendering, viz-model production, and browser harness responsibilities live

## Notes

**2026-04-01T12:30:00Z**

Cause: Feature 29 added two new packages (`satsuma-viz-backend`, `satsuma-viz-harness`) and changed the VizModel assembly ownership from the LSP server to the shared backend; documentation still reflected the old package map.
Fix: Updated `tooling/ARCHITECTURE.md` (package diagram, descriptions, dependency matrix, data flow), `docs/developer/ARCHITECTURE.md` (package map table, Mermaid dependency diagram, data flow, vscode-satsuma server section), and `README.md` (added "Viz harness (local Playwright tests)" section with full workflow instructions). All three documents now accurately reflect the eight-package tooling structure and make clear that Playwright tests are local-only.
