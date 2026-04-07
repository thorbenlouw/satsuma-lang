---
id: sl-zowz
status: open
deps: [sl-j4pw, sl-3c2w, sl-ny3r, sl-cca6, sl-xqd5, sl-e80e, sl-mm7v, sl-gfo4]
links: []
created: 2026-04-07T17:28:02Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, verification]
---
# Feature 30: verify expanded viz test suite and clean up artifacts

Run the relevant package checks, collect Playwright watcher results, inspect screenshot artifacts, and clean up incidental generated files before closing Feature 30. This ticket owns final feature-level verification rather than implementing new coverage. PRD reference: Acceptance Criteria 10.

## Acceptance Criteria

- [ ] npm --prefix tooling/satsuma-viz run test passes.
- [ ] npm --prefix tooling/satsuma-viz-backend run test passes.
- [ ] npm --prefix tooling/satsuma-viz-harness run build passes.
- [ ] Playwright runs through the existing sentinel watcher workflow and result output is captured in .playwright-results.txt.
- [ ] Required screenshot artifacts and manifest exist and are manually inspected.
- [ ] TODO checkboxes and ticket notes are updated with root cause/fix summaries as tasks complete.
- [ ] No unrelated generated artifacts are staged.
- [ ] Feature epic sl-0jva remains open until implementation and verification are complete.

