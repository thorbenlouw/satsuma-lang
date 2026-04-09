---
id: sl-mm7v
status: closed
deps: [sl-3c2w, sl-ny3r, sl-xqd5, sl-e80e]
links: []
created: 2026-04-07T17:28:02Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, screenshots]
---
# Feature 30: add screenshot review workflow

Add a deterministic screenshot script or Playwright project that emits named human/VLM review artifacts and a manifest. Capture the PRD-required screenshots: sfdc-overview-single.png, sfdc-detail-opportunity-ingestion.png, namespaces-overview-lineage.png, namespaces-detail-namespaced-mapping.png, metrics-overview-lineage-all-files.png, metrics-overview-file-filter-sources.png, reports-overview.png, filter-flatten-detail-completed-orders.png, filter-flatten-detail-order-line-facts.png, and sap-po-layout-stability.png. Write screenshots/manifest.json with file name, fixture path, view mode, UI state, viewport, timestamp, and test/script step name. Keep generated screenshots out of normal source control unless a later ticket deliberately adds references. PRD references: Scope / Screenshot artifacts for human and VLM review; Acceptance Criteria 8 and 9.

## Acceptance Criteria

- [ ] Screenshot workflow runs through the local watcher or a documented package script.
- [ ] All ten PRD-required screenshot names are emitted deterministically.
- [ ] screenshots/manifest.json records screenshot file name, fixture path, view mode, UI state, viewport, timestamp, and test/script step name.
- [ ] Generated screenshot artifacts are ignored or otherwise kept out of normal source control.
- [ ] Screenshots are documented and implemented as review artifacts, not golden pass/fail baselines.
- [ ] Workflow supports human markup and VLM review by pairing screenshots with manifest context.


## Notes

**2026-04-09T19:32:18Z**

**2026-04-09T19:32:18Z**

Cause: Feature 30 needed a deterministic, named screenshot workflow for human/VLM review separate from semantic pass/fail tests.
Fix: Added a dedicated 'screenshots' Playwright project (testMatch *.spec.ts) plus tooling/satsuma-viz-harness/test/screenshots.spec.ts which loads each PRD-required fixture, drives the harness into the documented UI state, captures all 10 named PNGs into screenshots/, and writes screenshots/manifest.json (file, fixture, viewMode, uiState, viewport, timestamp, step). Added an npm 'screenshots' script and gitignored screenshots/ — review artifacts, not golden baselines.
