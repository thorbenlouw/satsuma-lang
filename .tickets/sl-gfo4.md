---
id: sl-gfo4
status: closed
deps: [sl-mm7v]
links: []
created: 2026-04-07T17:28:02Z
type: task
priority: 2
assignee: Thorben Louw
parent: sl-0jva
tags: [feature-30, viz, tests, playwright, docs]
---
# Feature 30: update viz harness docs for expanded suite

Update developer-facing documentation for the expanded viz harness suite. Document the sentinel watcher workflow with an absolute-path reminder, the fixture matrix and why each fixture is covered, screenshot output location and manifest shape, the distinction between automated semantic assertions and human-review screenshots, and the known browser limitation that keeps Firefox as the default local browser target. PRD references: Scope / Documentation and workflow; Non-Goals.

## Acceptance Criteria

- [ ] A contributor can run the expanded Playwright suite from docs alone.
- [ ] Docs explain the sentinel watcher workflow and remind agents to give users the full absolute watch-and-test.sh path.
- [ ] Docs document the covered fixture matrix and the reason each fixture exists in the suite.
- [ ] Docs identify the screenshot output directory and manifest shape.
- [ ] Docs clearly distinguish automated assertions from human-review screenshots.
- [ ] Docs state that Playwright remains local-only and is not part of GitHub Actions for this feature.
- [ ] Docs mention the known browser limitation and Firefox default local target.


## Notes

**2026-04-09T19:33:31Z**

**2026-04-09T19:33:31Z**

Cause: The expanded viz harness suite had no contributor-facing documentation; the sentinel watcher protocol, fixture matrix rationale, and screenshot workflow lived only in CLAUDE.md and the PRD.
Fix: Added tooling/satsuma-viz-harness/README.md covering: the sentinel watcher workflow with the absolute-path reminder for agents, the Firefox-only / local-only constraint, the six-fixture matrix and why each one is included, the distinction between semantic assertions (harness.test.ts) and screenshot review (screenshots.spec.ts), the screenshots/ output directory and manifest shape, and the local checks expected before opening a PR.
