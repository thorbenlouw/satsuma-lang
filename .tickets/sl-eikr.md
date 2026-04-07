---
id: sl-eikr
status: closed
deps: [sl-0ssj]
links: []
created: 2026-04-07T17:28:02Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, selectors]
---
# Feature 30: add renderer test hooks for mapping detail and field coverage

Add stable data-testid hooks and state attributes needed for high-value Playwright assertions without brittle deep shadow DOM traversal. Cover mapping detail root/header/source/mapping/target columns, distinct source and target schema-card prefixes, arrow rows, each and flatten section rows, nested field rows, field lineage buttons, mapped/unmapped coverage indicators, transform text, highlighted @ref spans, and notes or note toggles where visible. Selector names should be stable and based on normalized schema, field, and mapping identities. PRD references: Scope / Stable test hooks for deep rendered content; Scope / Field coverage and highlighting.

## Acceptance Criteria

- [ ] Playwright can locate a specific mapping detail source field, target field, coverage indicator, arrow row, and transform without manual event dispatch.
- [ ] Mapping detail source and target schema cards use distinct testIdPrefix values.
- [ ] Mapping detail source, mapping, and target columns have stable test IDs.
- [ ] each and flatten section rows have stable test IDs.
- [ ] Coverage indicators expose mapped vs unmapped state through a selector or attribute.
- [ ] Nested field rows include enough identity to distinguish dotted paths such as customer.email from another email field.
- [ ] @satsuma/viz package tests are updated where selector rendering is already covered.


## Notes

**2026-04-07T22:37:22Z**

Cause: Playwright assertions for mapping detail needed stable selectors plus disambiguation across source vs target schemas, nested field paths, and nested each/flatten arrows.
Fix: Distinct testIdPrefix for source/target schema-cards in sz-mapping-detail, column test ids, section-prefixed arrow row ids, each/flatten section ids, dotted-path field ids and data-coverage attribute in sz-schema-card; added viz tests.
