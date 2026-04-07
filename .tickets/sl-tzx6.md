---
id: sl-tzx6
status: open
deps: [sl-0ssj]
links: []
created: 2026-04-07T17:28:01Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, events]
---
# Feature 30: fix viz harness event recorder contract

Update the harness recorder so window.__satsumaHarness.events captures the production event payloads emitted by @satsuma/viz from real interactions, not only CustomEvent.detail. Normalize navigate from SzNavigateEvent.location, field-hover from schemaId/fieldName including hover-leave nulls where asserted, field-lineage from schemaId/fieldName, and open-mapping, expand-lineage, and export payloads where the renderer exposes them. Preserve CustomEvent.detail compatibility only where it is genuinely still used, preferably behind a small normalization helper with focused tests. PRD references: Scope / Harness event contract; Acceptance Criteria 1 and 2.

## Acceptance Criteria

- [ ] A real schema or field click records a navigate event with non-empty URI and numeric line/character position.
- [ ] A real field-lineage button click records schema ID and field name.
- [ ] Hovering a real field row records field-hover with schema ID and field name, and hover leave is represented consistently when asserted.
- [ ] open-mapping, expand-lineage, and export payloads are normalized where covered by the suite.
- [ ] Existing harness event-log consumers still read a stable JSON object shape.
- [ ] Synthetic CustomEvent.detail support is either covered at recorder-helper level or removed from the main Playwright path with rationale.

