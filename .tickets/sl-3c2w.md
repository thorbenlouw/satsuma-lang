---
id: sl-3c2w
status: closed
deps: [sl-tzx6, sl-eikr]
links: []
created: 2026-04-07T17:28:02Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, fixtures]
---
# Feature 30: expand overview coverage across viz fixture families

Add overview tests for the PRD fixture matrix: sfdc-to-snowflake non-namespaced vanilla schemas and mapping card in single-file mode, namespaces/ns-platform namespaced cards and mapping nodes with qualified IDs and labels, metrics-platform metric cards and imported source cards in lineage mode, reports-and-models report/model card metadata, and sap-po-to-mfcs larger layout coverage beyond ready state. PRD references: Scope / Fixture matrix; Scope / Automated Playwright coverage / Overview rendering.

## Acceptance Criteria

- [ ] sfdc-to-snowflake/pipeline.stm overview asserts expected vanilla schema cards and mapping card in single-file mode.
- [ ] namespaces/ns-platform.stm overview asserts qualified namespaced cards, mapping nodes, and namespace labels.
- [ ] metrics-platform/metrics.stm overview asserts metric cards and imported source schema cards in lineage mode.
- [ ] reports-and-models/pipeline.stm overview asserts report/model cards and report metadata.
- [ ] sap-po-to-mfcs/pipeline.stm checks larger overview behaviour beyond data-ready-state=ready.
- [ ] Overview coverage explicitly exercises both namespace and non-namespace card height paths.


## Notes

**2026-04-09T16:11:09Z**

**2026-04-09T00:00:00Z**

Cause: overview Playwright coverage was limited to two ad-hoc sfdc cases and a single sap ready-state smoke; namespaced, metrics, reports, and large-fixture content was untested.
Fix: added one describe block per fixture family asserting non-namespaced sfdc cards, namespace-qualified cards plus the new namespace-pill testid hook on sz-schema-card, metric cards via a new overview-metric-card testid added on sz-metric-card, report/model cards in reports-and-models, and a sap stability check that asserts cards plus a mapping connector beyond data-ready-state=ready.
