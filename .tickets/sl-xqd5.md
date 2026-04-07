---
id: sl-xqd5
status: open
deps: [sl-tzx6, sl-eikr]
links: []
created: 2026-04-07T17:28:02Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, filters]
---
# Feature 30: add filter and lineage-mode Playwright tests

Cover toolbar filtering and lineage-mode model differences through real controls. Exercise namespace filtering on ns-platform, file filtering on metrics-platform lineage mode across all files/metrics.stm/metric_sources.stm/all files, and a single-file versus lineage-mode comparison where an imported source card appears only in lineage mode. PRD reference: Scope / Automated Playwright coverage / Filters and lineage mode.

## Acceptance Criteria

- [ ] Namespace filter on ns-platform.stm is exercised through the real toolbar control.
- [ ] Selecting one namespace such as mart hides unrelated namespace cards and reset restores all namespaces.
- [ ] File filter on metrics-platform/metrics.stm lineage mode is exercised through the real toolbar control.
- [ ] Tests assert all files, metrics.stm only, metric_sources.stm only, and reset to all files.
- [ ] Single-file mode vs lineage mode asserts an imported-source card appears only in lineage mode for a chosen fixture.
- [ ] Tests wait on viz ready state after each filter or mode transition.
- [ ] Assertions are based on visible cards and mapping nodes.

