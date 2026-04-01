---
id: sl-lkmt
status: open
deps: []
links: []
created: 2026-04-01T09:24:11Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-i34p
tags: [feature-29, viz, frontend, testability]
---
# Feature 29 task: add renderer testability hooks to satsuma-viz

Improve tooling/satsuma-viz so browser automation can drive the real UI deterministically.

This task adds stable selectors, a ready/layout-complete signal, and a reduced-motion or test mode so browser tests can assert behaviour without timing hacks or VS Code-specific shims.

PRD reference: features/29-viz-harness-and-shared-backend/PRD.md
TODO reference: features/29-viz-harness-and-shared-backend/TODO.md

## Acceptance Criteria

- tooling/satsuma-viz exposes stable data-testid hooks for the core user interactions needed in browser tests
- The renderer exposes a deterministic readiness signal after layout/rendering is complete
- The renderer can run in a reduced-motion or otherwise stable test mode suitable for automation
- Interaction intents remain observable in a host-agnostic way
- Renderer tests cover the new automation-oriented behaviour where appropriate


## Notes

**2026-04-01T10:30:21Z**

PR checkpoint prepared: satsuma-viz now exposes stable automation selectors, host-visible ready-state attributes/events, and test/reduced-motion mode hooks. Verified satsuma-viz tests and downstream vscode-satsuma build locally.

**2026-04-01T10:41:18Z**

Cause: The new test-id sanitizer used a backtracking regex over uncontrolled input, which GitHub Advanced Security flagged as a potential polynomial-time pattern. Fix: Replaced the regex sanitizer with a linear-time character scanner in the viz renderer helpers and added coverage for repeated separator input.
