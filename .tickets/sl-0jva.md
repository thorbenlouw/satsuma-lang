---
id: sl-0jva
status: closed
deps: [sl-zowz]
links: []
created: 2026-04-07T16:57:29Z
type: epic
priority: 2
assignee: Thorben Louw
tags: [feature-30, viz, tests, playwright]
---
# Feature 30: viz test suite expansion

Expand the standalone viz harness into a high-value browser test suite covering real interactions, fixture families, complex mapping detail views, geometry sanity checks, and screenshot artifacts for human/VLM review.

## Acceptance Criteria

Feature 30 PRD and TODO exist; implementation tasks can be mirrored into child tk tickets; the epic remains open until the expanded viz test suite is implemented and verified.

## Notes

**2026-04-09T19:50:13Z**

**2026-04-09T19:50:13Z**

Cause: Feature 30 expanded the standalone viz harness into a high-value browser test suite covering real interactions, fixture families, complex mapping detail views, geometry sanity checks, and screenshot artifacts.
Fix: All implementation children closed (sl-0ssj, sl-tzx6, sl-j4pw, sl-3c2w, sl-eikr, sl-ny3r, sl-cca6, sl-xqd5, sl-e80e, sl-mm7v, sl-gfo4, sl-zowz). Final suite: 40/40 Playwright tests across firefox + screenshots projects, 10 deterministic screenshot artifacts with manifest, and viz-harness README documenting the workflow. f3vt-qb8u (overview routing-quality) is parented under this epic but is non-blocking — kept open at P3 as a follow-up. Three documented gaps from the implementation tickets remain intentionally out of scope (MappingBlock.notes not rendered in sz-mapping-detail per sl-ny3r, single-file vs lineage mode card-set parity per sl-xqd5, expand-lineage event having no UI control per sl-j4pw).
