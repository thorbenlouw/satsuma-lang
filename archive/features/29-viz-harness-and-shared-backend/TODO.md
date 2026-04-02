# Feature 29 TODO

PRD: [PRD.md](./PRD.md)

This TODO breaks Feature 29 into implementation tasks that should be mirrored in
`tk` tickets. Each task refers back to the PRD and should only be closed once
its code, tests, and documentation obligations are complete.

## Task Breakdown

Epic: `sl-i34p` — Feature 29: viz harness and shared backend

### 1. Shared viz backend extraction

Ticket: `sl-f1kt`

Create a new shared package under `tooling/` that owns reusable VizModel
production logic currently held in `tooling/satsuma-lsp/`.

Scope:

- extract `buildVizModel()` and `mergeVizModels()`
- extract or adapt the viz-facing workspace-index logic needed for model assembly
- preserve import-reachable scoping and full-lineage behaviour
- add package-local tests for the extracted backend

PRD reference:

- Proposed Package Layout
- Scope of Changes / Shared Viz Backend Extraction
- Acceptance Criteria / Shared backend

### 2. LSP and VS Code integration refactor

Ticket: `sl-vp7w`

Refactor `tooling/satsuma-lsp/` and the VS Code viz path so they consume the new
shared backend package rather than owning a parallel implementation.

Scope:

- update viz-related LSP request handlers to delegate to the shared backend
- keep editor- and protocol-specific concerns inside the LSP and VS Code shell
- update any build wiring affected by the package extraction

PRD reference:

- Proposed Package Layout
- Scope of Changes / VS Code Integration Refactor
- Acceptance Criteria / Shared backend

### 3. Renderer testability hooks

Ticket: `sl-lkmt`

Improve `tooling/satsuma-viz/` so browser automation can drive the real UI
deterministically.

Scope:

- add stable `data-testid` hooks for key UI surfaces
- add an explicit ready/layout-complete signal
- add a stable reduced-motion or test mode
- ensure interaction intents are observable in a host-agnostic way

PRD reference:

- Scope of Changes / Renderer Testability Improvements
- Acceptance Criteria / Renderer testability

### 4. Standalone viz harness app

Ticket: `sl-2jq2`

Build a standalone browser harness under `tooling/` that renders fixture-driven
Satsuma source and the shared visualization side-by-side.

Scope:

- load named `.stm` fixtures or curated fixture sets
- build VizModels through the shared backend package
- render source and viz side-by-side
- surface emitted interaction events for browser assertions

PRD reference:

- Proposed Package Layout / tooling/satsuma-viz-harness
- Scope of Changes / Standalone Viz Harness
- Acceptance Criteria / Browser harness

### 5. Playwright browser tests

Ticket: `sl-22fg`

Add browser-based UI coverage for the harness using canonical Satsuma fixtures.

Scope:

- configure Playwright
- add purposeful end-to-end tests for overview, detail, hover/highlight,
  cross-file expansion, navigation intent, and a larger fixture
- keep the suite deterministic and aligned with renderer ready hooks
- keep this as a local developer-machine workflow for now; do not require CI
  execution in this feature

PRD reference:

- Scope of Changes / Browser Test Infrastructure
- Acceptance Criteria / Playwright coverage

### 6. CI and release workflow updates

Ticket: `sl-be9e`

Update CI and release build wiring so the refactored VS Code package path still
builds correctly after the new package boundaries land.

Scope:

- update `.github/workflows/ci.yml` as needed for the refactored package graph
- update `.github/workflows/release.yml` as needed for extension packaging
- update `docs/developer/CI-WORKFLOWS.md` to match the final workflow behaviour
- keep Playwright out of CI for this feature

PRD reference:

- Decision / What changes
- Scope of Changes / CI and Release Build Updates
- Acceptance Criteria / CI and release build wiring

### 7. Documentation updates

Ticket: `sl-66hf`

Update top-level and architecture documentation so the implemented package map,
data flow, and testing workflow match the new structure.

Scope:

- update `README.md`
- update `tooling/ARCHITECTURE.md`
- update `docs/developer/ARCHITECTURE.md`
- update any affected package-level README files

PRD reference:

- Decision / What changes
- Acceptance Criteria / Documentation

## Suggested Dependency Order

1. Shared viz backend extraction
2. Renderer testability hooks
3. LSP and VS Code integration refactor
4. Standalone viz harness app
5. Playwright browser tests
6. CI and release workflow updates
7. Documentation updates

The documentation task should happen during implementation, but it should depend
on the architectural work so the final docs describe the code that actually
landed.
