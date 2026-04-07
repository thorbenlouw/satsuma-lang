---
id: sl-j4pw
status: open
deps: [sl-tzx6, sl-eikr]
links: []
created: 2026-04-07T17:28:02Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, events]
---
# Feature 30: replace synthetic event tests with real interactions

Rewrite event-oriented harness tests so the main Playwright suite clicks and hovers actual rendered UI. Cover schema or field navigation, field-lineage button clicks, field hover events, and arrow-row navigation through production UI elements. Keep only a narrow recorder-level unit test for synthetic/custom event compatibility if the recorder still needs it. PRD references: Scope / Automated Playwright coverage / Interaction events; Acceptance Criteria 1 and 2.

## Acceptance Criteria

- [ ] Main Playwright event tests no longer pass purely by dispatching synthetic CustomEvent objects from <satsuma-viz>.
- [ ] A real schema header or field row click asserts a navigate event payload.
- [ ] A real field lineage button click asserts a field-lineage event payload.
- [ ] Hovering a real field row asserts field-hover in the event log.
- [ ] Clicking a real arrow row asserts a navigation event for that arrow source location.
- [ ] Failures produce actionable Playwright assertions tied to visible UI controls.
- [ ] Every new test() block opens with a purpose comment or behaviour-focused description per repo standards.

