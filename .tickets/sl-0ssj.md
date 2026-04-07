---
id: sl-0ssj
status: in_progress
deps: []
links: []
created: 2026-04-07T17:28:01Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, audit]
---
# Feature 30: audit current viz harness coverage and selector gaps

Audit the current viz harness and renderer selector surface before changing tests. Document the existing Playwright coverage in tooling/satsuma-viz-harness/test/harness.test.ts, classify each case as real UI behaviour, synthetic event plumbing, ready-state coverage, or layout smoke coverage, and map every planned replacement test to a fixture and user-visible invariant. Inspect tooling/satsuma-viz/src/ for selector gaps around mapping detail source/target cards, nested field rows, coverage indicators, transforms, each/flatten rows, and notes. Decide whether canonical examples are sufficient or whether a small harness-only fixture is needed. PRD references: Problem; Scope / Stable test hooks for deep rendered content; Scope / Fixture matrix.

## Acceptance Criteria

- [x] Audit notes are recorded in the ticket notes or a short feature-folder doc.
- [x] Every existing harness Playwright test is classified by what risk it actually covers.
- [x] Every planned Playwright test maps to a specific fixture and one user-visible invariant.
- [x] Missing renderer selectors are listed with owning component/file candidates.
- [x] Any need for harness-only fixtures is explicitly accepted or rejected with rationale.
- [x] No synthetic-only event test remains as the recommended implementation path.
