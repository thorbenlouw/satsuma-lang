---
id: sl-i34p
status: closed
deps: []
links: []
created: 2026-04-01T09:24:11Z
type: epic
priority: 1
assignee: Thorben Louw
tags: [feature-29, viz, architecture, testability]
---
# Feature 29: viz harness and shared backend

Implements Feature 29 as defined in features/29-viz-harness-and-shared-backend/PRD.md.

This epic covers extraction of a shared viz backend from tooling/satsuma-lsp, addition of a standalone browser harness for the mapping visualization, renderer testability improvements, Playwright-based browser coverage, CI/release build updates for the refactored VS Code package path, and the required README/architecture documentation updates.

See also: features/29-viz-harness-and-shared-backend/TODO.md

## Acceptance Criteria

- All child tickets for Feature 29 are complete and trace back to features/29-viz-harness-and-shared-backend/PRD.md
- The visualization can be exercised end-to-end in a standalone browser harness without depending on VS Code webviews
- CI and release continue to build the refactored VS Code package path correctly after the package extraction
- README.md, tooling/ARCHITECTURE.md, and docs/developer/ARCHITECTURE.md are updated to reflect the final package map and test workflow

## Notes

**2026-04-01T13:00:00Z**

Cause: Feature 29 aimed to make the Satsuma visualization testable without VS Code by extracting shared backend logic and building a fixture-driven browser harness.
Fix: All child tickets delivered: `@satsuma/viz-backend` extracted from LSP server (sl-f1kt, sl-vp7w); `satsuma-viz-harness` standalone harness with 8 passing Playwright tests (sl-2jq2, sl-22fg); CI/release workflow updated for new package structure (sl-be9e, sl-lkmt); docs updated (sl-66hf). PR: thorbenlouw/satsuma-lang#184.
