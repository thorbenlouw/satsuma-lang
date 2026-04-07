---
id: sl-ny3r
status: open
deps: [sl-tzx6, sl-eikr]
links: []
created: 2026-04-07T17:28:02Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, detail]
---
# Feature 30: add mapping detail coverage for canonical mappings

Add mapping detail assertions for representative canonical mappings. Cover opportunity ingestion in sfdc-to-snowflake with source schemas, target schema, arrow rows amount_usd/arr_value/pipeline_stage/is_closed/ingested_at, computed arrows, map transform, transform text, and highlighted @ref spans. Cover one namespaced mapping in ns-platform with namespace label, qualified source/target names, and source -> mapping -> target ordering. Cover completed orders and order line facts in filter-flatten-governance with multiple sources, join text, mapping notes, nested fields, governance/PII indicators where visible, flatten rows, and target rows line_number/sku/quantity/line_total. PRD reference: Scope / Automated Playwright coverage / Mapping detail rendering.

## Acceptance Criteria

- [ ] Detail tests verify content inside the mapping detail view, not only that the root appears.
- [ ] opportunity ingestion asserts expected source schemas, target schema, specified arrow rows, computed arrows, map transform, NL transform text, and highlighted @ref spans.
- [ ] A namespaced mapping asserts namespace label, qualified source and target names, and detail column ordering.
- [ ] completed orders asserts multiple source schemas, source join text, mapping note, nested child fields, and visible governance/PII indicators where applicable.
- [ ] order line facts asserts a flatten section row, nested source child fields, and target rows line_number, sku, quantity, and line_total.
- [ ] Tests stay fixture-grounded and do not duplicate VizModel unit-test semantics.

