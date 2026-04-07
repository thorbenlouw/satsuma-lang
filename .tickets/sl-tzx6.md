---
id: sl-tzx6
status: closed
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

- [x] A real schema or field click records a navigate event with non-empty URI and numeric line/character position.
- [x] A real field-lineage button click records schema ID and field name.
- [x] Hovering a real field row records field-hover with schema ID and field name, and hover leave is represented consistently when asserted.
- [x] open-mapping, expand-lineage, and export payloads are normalized where covered by the suite.
- [x] Existing harness event-log consumers still read a stable JSON object shape.
- [x] Synthetic CustomEvent.detail support is either covered at recorder-helper level or removed from the main Playwright path with rationale.


## Notes

**2026-04-07T18:18:42Z**

Cause: The harness recorded CustomEvent.detail directly, but production @satsuma/viz events carry navigate, hover, lineage, and mapping payloads on event instance properties. Fix: Added harness-side event normalization for production event properties while preserving supported CustomEvent payloads, then upgraded harness tests to assert normalized payloads from real UI interactions where existing selectors allow it. (commit e168c4d)
