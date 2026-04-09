---
id: sl-cca6
status: closed
deps: [sl-tzx6, sl-eikr]
links: []
created: 2026-04-07T17:28:02Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, highlighting]
---
# Feature 30: add field coverage and highlighting tests

Assert the visual contracts that make mapping detail useful: mapped and unmapped field coverage indicators, arrow-row hover highlighting, source-field hover highlighting, target-field hover highlighting for multi-source mappings, and dotted nested-field identity rather than leaf-name matching. Use stable selectors or attributes from the selector-hook work and validate visible highlighted state, not only event-log entries. PRD reference: Scope / Automated Playwright coverage / Field coverage and highlighting.

## Acceptance Criteria

- [ ] At least one non-nested mapping and one nested mapping are covered.
- [ ] Mapped target fields assert mapped coverage indicators through stable selectors or attributes.
- [ ] Unmapped target fields assert unmapped coverage indicators through stable selectors or attributes.
- [ ] Hovering an arrow row visibly highlights the matching source and target field rows.
- [ ] Hovering a source field visibly highlights the arrow row and mapped target field.
- [ ] Hovering a target field visibly highlights upstream source fields for a multi-source mapping.
- [ ] Nested child fields are matched by dotted path identity, not only leaf field name.


## Notes

**2026-04-09T16:19:28Z**

**2026-04-09T00:00:00Z**

Cause: nothing asserted that target field rows surface the mapped/unmapped distinction or that hovering arrows/fields propagated highlight to partner rows — both are visual contracts users rely on.
Fix: added two coverage tests (sfdc opportunity ingestion mapped vs source_system unmapped, and order line facts nested flatten leaf coverage) plus two highlight tests (arrow-row hover highlights both source and target field rows; reverse direction target hover highlights upstream source). Uses the existing data-coverage attribute and .hl class — no renderer changes required.
