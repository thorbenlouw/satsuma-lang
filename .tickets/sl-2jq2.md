---
id: sl-2jq2
status: open
deps: [sl-f1kt]
links: []
created: 2026-04-01T09:24:11Z
type: task
priority: 1
assignee: Thorben Louw
parent: sl-i34p
tags: [feature-29, viz, harness, frontend]
---
# Feature 29 task: build standalone viz harness app

Build a standalone browser harness under tooling/ that renders fixture-driven Satsuma source and the shared visualization side-by-side.

The harness should load canonical fixtures or curated fixture sets, build VizModels through the shared backend package, and surface interaction events for browser assertions.

PRD reference: features/29-viz-harness-and-shared-backend/PRD.md
TODO reference: features/29-viz-harness-and-shared-backend/TODO.md

## Acceptance Criteria

- A standalone viz harness package exists under tooling/
- The harness renders fixture-driven source text and the shared visualization side-by-side in a browser
- The harness builds VizModels through the shared backend package rather than through duplicated logic
- The harness can switch between multiple named fixtures or fixture sets without unstable state leakage
- The harness surfaces interaction intents in a form that browser tests can assert against without VS Code APIs

