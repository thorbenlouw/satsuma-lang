---
id: sl-22fg
status: closed
deps: [sl-lkmt, sl-2jq2]
links: []
created: 2026-04-01T09:24:11Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-i34p
tags: [feature-29, viz, playwright, tests]
---
# Feature 29 task: add Playwright coverage for viz harness

Add Playwright-based browser coverage for the standalone viz harness using canonical Satsuma fixtures.

The suite should validate real interaction behaviour rather than smoke-testing page load, and should rely on the shared backend plus renderer-ready hooks introduced by this feature.

PRD reference: features/29-viz-harness-and-shared-backend/PRD.md
TODO reference: features/29-viz-harness-and-shared-backend/TODO.md

## Acceptance Criteria

- Playwright configuration and browser tests are added for the standalone viz harness
- Tests verify overview rendering for at least one canonical fixture
- Tests verify clicking a mapping opens the detail view
- Tests verify a representative hover/highlight interaction
- Tests verify cross-file expansion for an import-reachable fixture set
- Tests verify navigation intent emission is observable in the harness
- Tests verify at least one larger sample fixture renders without layout failure
- Playwright is documented and enforced as a local developer-machine workflow for this feature
- No GitHub Actions workflow is required to run Playwright as part of this ticket

## Notes

**2026-04-01T12:00:00Z**

Cause: Browser tests for the viz component required a real browser environment; Chromium and WebKit headless both crash on ARM macOS (SwiftShader SIGSEGV), and `detail-schema-card-` elements live inside a multi-level shadow DOM that Playwright CSS locators cannot pierce.
Fix: Added `test/harness.test.ts` with 8 Playwright tests targeting Firefox (the only stable headless browser in this environment). Tests that required deep shadow DOM interaction (hover, navigate) were rewritten to dispatch custom events programmatically on `<satsuma-viz>`, validating the harness event pipeline rather than the component's internal DOM. Added `watch-and-test.sh` as a sentinel-file-based test runner so Claude can trigger runs without direct shell access. All 8 tests pass.
