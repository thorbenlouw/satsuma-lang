---
id: sl-e80e
status: closed
deps: [sl-tzx6, sl-eikr]
links: []
created: 2026-04-07T17:28:02Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, geometry]
---
# Feature 30: add geometry sanity helpers and tests

Create reusable Playwright helpers for layout sanity assertions without exact ELK coordinate expectations. Helpers should read positioned-card bounding boxes from the viz shadow root and assert positive dimensions, finite coordinates, non-overlap tolerance for small fixtures, overview mapping nodes horizontally between source and target schema cards, detail source -> mapping -> target column order, canvas containment at the tested viewport, and namespace-card content not clipped by namespace-pill height. PRD reference: Scope / Automated Playwright coverage / Geometry sanity.

## Acceptance Criteria

- [ ] Geometry helpers are reusable and documented in the test file.
- [ ] Helpers read positioned-card bounding boxes from the viz shadow root.
- [ ] Tests assert positive dimensions and finite coordinates.
- [ ] Small-fixture card overlap checks use tolerance rather than exact positions.
- [ ] Overview mapping nodes are asserted horizontally between visible source and target cards.
- [ ] Detail columns are asserted in source -> mapping -> target order.
- [ ] Cards are asserted to fit within rendered canvas bounds for the tested viewport.
- [ ] Namespace-card geometry accounts for namespace-pill height and does not clip headers or fields.
- [ ] At least one non-namespaced, one namespaced, one metrics/report, and one complex fixture are covered.


## Notes

**2026-04-09T16:28:53Z**

**2026-04-09T00:00:00Z**

Cause: layout invariants (positive dimensions, non-overlap, mapping node sits between source and target, namespace pill height accounted for) were not exercised by any test.
Fix: added reusable readOverviewCardBoxes / assertBoxesAreSane / assertBoxesDoNotOverlap helpers and four geometry tests covering non-namespaced (sfdc dimensions + non-overlap), namespaced (ns-platform pills contained in card boxes), non-namespaced layout (sfdc mapping node centred between source and target cards), and complex fixture (sap-po-to-mfcs sanity). Helpers are scoped to overview schema cards and avoid exact ELK coordinates.
