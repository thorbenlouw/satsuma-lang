# Feature 29 — Viz Harness and Shared Backend for Browser-Testable Mapping Visualization

> **Status: PLANNED** (2026-04-01)

## Goal

Make the Satsuma mapping visualization reliably testable outside VS Code by extracting shared viz-model production logic into a reusable backend package and introducing a standalone browser harness that renders canonical `.stm` fixtures side-by-side with the visualization.

The primary success criterion is:

**The mapping visualization can be exercised end-to-end with Playwright against canonical Satsuma fixtures, without depending on VS Code webviews.**

---

## Problem

The repository already contains two important pieces of reusable infrastructure:

1. **The renderer is already modular.** The visualization itself lives in `tooling/satsuma-viz/` as a standalone web component package that consumes a `VizModel`.
2. **The protocol contract is already shared.** The `VizModel` JSON shape lives in `tooling/satsuma-viz-model/` and is used across packages.

But the architecture still falls short of the portability promised by `tooling/ARCHITECTURE.md`:

- **Viz model production is still owned by the LSP package.** `buildVizModel()`, `mergeVizModels()`, import-scoped model assembly, and the viz-facing workspace indexing logic live in `tooling/satsuma-lsp/`.
- **The interactive host shell is still VS Code-shaped.** The primary real-world rendering surface is the VS Code webview host in `tooling/vscode-satsuma/src/webview/viz/`.
- **There is no stable browser harness for end-to-end UI testing.** Current tests cover the renderer bundle and the VizModel builder separately, but not the actual browser interaction surface that users see.

This creates three problems:

1. **UI regressions are harder to catch.** Playwright-style interaction testing is awkward when the production surface is embedded in a VS Code webview and depends on LSP custom requests.
2. **Future reuse is partially blocked.** An IntelliJ plugin or a standalone web viewer can reuse `@satsuma/viz`, but must either reimplement the VizModel backend path or depend on LSP-internal code that was not designed as a shared consumer API.
3. **The documented architecture is only partially realised.** The current architecture docs say the visualization should be reusable outside VS Code, but the most important data-production path remains in an editor-facing package.

---

## Design Principle

This feature is about **testability first, productization second**.

The first standalone browser app is not primarily a new end-user product. It is a deterministic, browser-based harness for the existing visualization so that interaction behaviour can be tested against real Satsuma fixtures under automation.

That means:

- the browser harness must use the same renderer as VS Code
- the browser harness must use the same VizModel production logic as VS Code
- the viz must expose explicit automation-friendly hooks such as stable selectors and readiness signals
- implementation is not complete until the architecture and package docs describe the new structure accurately

---

## Decision

### What changes

1. **Extract shared viz backend logic into a new package under `tooling/`.**

   This package owns the reusable, non-editor-specific logic needed to produce browser-ready `VizModel` payloads from Satsuma source files and multi-file workspaces.

2. **Keep `tooling/satsuma-viz-model/` as the cross-package protocol contract.**

   The VizModel type package remains the stable JSON boundary between producers and renderers.

3. **Keep `tooling/satsuma-viz/` as the reusable renderer, but add explicit testability hooks.**

   The renderer must become easier to drive and assert against in browser automation, without introducing VS Code-specific dependencies.

4. **Introduce a standalone viz harness package under `tooling/`.**

   This package renders fixture-driven Satsuma source and the shared visualization side-by-side in a browser, and becomes the target for Playwright tests.

5. **Refactor `tooling/satsuma-lsp/` to consume the new shared backend package instead of owning the viz model path directly.**

   The LSP remains responsible for protocol wiring, not for exclusive ownership of viz-model production logic.

6. **Update CI and release build wiring so the refactored VS Code package path continues to build correctly.**

   This feature changes package boundaries under `tooling/`. CI and release workflows must continue to build and validate the VS Code extension and its dependent packages correctly after the extraction.

7. **Update top-level and architecture documentation during implementation.**

   The feature is not done if `README.md`, `tooling/ARCHITECTURE.md`, and `docs/developer/ARCHITECTURE.md` still describe the old structure.

### What does not change

- `tooling/satsuma-viz/` remains the canonical renderer package.
- `tooling/satsuma-viz-model/` remains the single source of truth for the serialized contract.
- The VS Code extension remains a supported consumer of the visualization.
- This feature does not attempt to add visual editing or full browser authoring.

---

## Proposed Package Layout

### New package: `tooling/satsuma-viz-backend/`

This package should own reusable visualization-model production logic that is currently trapped inside `tooling/satsuma-lsp/`.

Expected responsibilities:

- build a `VizModel` from a parsed file plus a workspace-aware index
- merge per-file VizModels into a full-lineage view
- own or adapt the workspace indexing needed for viz resolution
- own import-reachable scoping for viz assembly
- provide a browser/host-neutral API that can be used by LSP, harness, and future editor integrations

This package is a better fit for the architecture than leaving this logic inside `tooling/satsuma-lsp/`, because the logic is no longer LSP-specific once multiple consumers need it.

### New package: `tooling/satsuma-viz-harness/`

This package should be a minimal standalone browser app focused on testability.

Expected responsibilities:

- load named fixture `.stm` files or fixture sets
- display source text and visualization side-by-side
- build viz data through the shared backend package, not via ad hoc duplication
- expose a stable page structure suitable for Playwright assertions
- surface interaction events such as navigate, open mapping, expand lineage, and field-lineage requests in a browser-observable way

### Existing package: `tooling/satsuma-lsp/`

Expected post-refactor responsibilities:

- continue to answer custom LSP requests such as `satsuma/vizModel` and `satsuma/vizFullLineage`
- delegate VizModel production to the shared backend package
- keep editor/LSP protocol responsibilities local

### Existing package: `tooling/vscode-satsuma/`

Expected post-refactor responsibilities:

- remain a thin host shell for VS Code
- continue to host the shared visualization in a webview
- avoid owning unique viz behaviour that the browser harness cannot reproduce

---

## Scope of Changes

### 1. Shared Viz Backend Extraction

**Files/packages affected:**

- `tooling/satsuma-lsp/src/viz-model.ts`
- `tooling/satsuma-lsp/src/workspace-index.ts`
- `tooling/satsuma-lsp/src/server.ts`
- new package under `tooling/`

**Required changes:**

1. Extract `buildVizModel()` and `mergeVizModels()` into a shared backend package.
2. Extract or adapt the workspace-index logic required for viz assembly so that the browser harness and future editor integrations do not depend on LSP-internal modules.
3. Ensure import-reachable scoping and full-lineage assembly remain behaviourally identical after the extraction.
4. Leave LSP protocol handlers as thin adapters that call the shared backend package.

**Why this matters:**

If the browser harness and the VS Code extension do not share the same VizModel production path, Playwright tests will validate a parallel system instead of the production one.

### 2. Renderer Testability Improvements

**Files/packages affected:**

- `tooling/satsuma-viz/src/satsuma-viz.ts`
- `tooling/satsuma-viz/src/components/*`
- `tooling/satsuma-viz/test/*`

**Required changes:**

1. Add stable `data-testid` hooks for core interaction targets such as:
   - root viz surface
   - overview mapping nodes
   - schema cards
   - toolbar actions
   - detail-view tables
2. Add an explicit ready/layout-complete signal so browser tests do not rely on fragile timeouts.
3. Add a test mode or reduced-motion mode to suppress animation-driven flake.
4. Ensure emitted interaction intents are observable in a generic browser host, not just through VS Code message passing.

**Why this matters:**

A layout-heavy interactive UI is difficult to test reliably if selectors are unstable and readiness is inferred from timing.

### 3. Standalone Viz Harness

**Files/packages affected:**

- new package under `tooling/`
- potentially fixture references under `examples/`

**Required changes:**

1. Build a small standalone browser app that:
   - loads canonical Satsuma fixture files
   - shows source and viz side-by-side
   - can switch between multiple named fixtures
   - records or surfaces interaction events for test assertions
2. Make the harness the target for Playwright UI tests.
3. Prefer canonical examples or a curated subset of them over synthetic-only fixtures.

**MVP note:**

The harness does not need full end-user file upload or editing. It needs deterministic, fixture-driven behaviour for testing.

### 4. VS Code Integration Refactor

**Files/packages affected:**

- `tooling/vscode-satsuma/src/webview/viz/panel.ts`
- `tooling/vscode-satsuma/src/webview/viz/viz.ts`
- `tooling/vscode-satsuma/esbuild.js`

**Required changes:**

1. Update the VS Code viz path to consume the shared backend indirectly via the LSP.
2. Keep host-specific behaviour in the extension shell.
3. Avoid introducing any new VS Code-only renderer features that are unavailable in the harness.
4. Update build wiring if the extraction changes package boundaries or aliases.

### 5. Browser Test Infrastructure

**Files/packages affected:**

- new Playwright config and tests in the harness package or repo-level test area

**Required changes:**

1. Add Playwright-based browser tests for the harness.
2. Cover canonical interaction flows, not just page-load smoke tests.
3. Keep tests deterministic and purpose-driven, following the repo’s existing testing expectations.
4. Treat Playwright as a required local developer-machine workflow for this feature. CI integration is explicitly deferred.

### 6. CI and Release Build Updates

**Files/packages affected:**

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `docs/developer/CI-WORKFLOWS.md`
- any package scripts affected by the new package graph

**Required changes:**

1. Update CI so the refactored VS Code extension build still validates correctly after the new shared viz backend and harness packages are introduced.
2. Update release build wiring if package installation or bundling order changes due to the extraction.
3. Keep Playwright out of CI for now; browser UI coverage is a required local workflow, not a required GitHub Actions workflow in this feature.
4. Update CI workflow documentation to describe the final build/test behaviour accurately.

---

## Acceptance Criteria

### Shared backend

1. A shared viz backend package exists under `tooling/` and owns reusable VizModel production logic previously held in `tooling/satsuma-lsp/`.
2. `tooling/satsuma-lsp/` answers viz-related custom requests by calling the shared backend package rather than owning a separate implementation.
3. Full-lineage VizModel assembly remains import-scoped and behaviourally equivalent to the current LSP implementation.
4. Shared backend tests cover the extracted behaviour at the new package boundary.

### Browser harness

1. A standalone viz harness package exists under `tooling/`.
2. The harness renders fixture-driven source text and the shared visualization side-by-side in a browser.
3. The harness can switch between multiple named fixture files or fixture sets without unstable state leakage.
4. The harness surfaces interaction intents in a way that Playwright can assert against without VS Code APIs.

### Renderer testability

1. `tooling/satsuma-viz/` exposes stable selectors for the core user interactions needed in browser tests.
2. The renderer exposes a deterministic readiness signal after layout/rendering is complete.
3. Tests can run the viz in a reduced-motion or otherwise stable mode suitable for automation.

### Playwright coverage

1. Playwright tests verify that the overview view renders expected schemas and mappings for at least one canonical fixture.
2. Playwright tests verify that clicking a mapping opens the detail view.
3. Playwright tests verify that a representative hover/highlight interaction produces the expected visible effect or observable state.
4. Playwright tests verify that cross-file expansion works for an import-reachable fixture set.
5. Playwright tests verify that navigation intent emission is observable in the harness.
6. Playwright tests verify that at least one larger sample fixture renders without layout failure.
7. The feature documents Playwright as a required local developer workflow; CI execution of Playwright is not required.

### CI and release build wiring

1. `.github/workflows/ci.yml` is updated as needed so the refactored VS Code package path still builds and validates correctly.
2. `.github/workflows/release.yml` is updated as needed so the extension packaging path still succeeds after the package extraction.
3. `docs/developer/CI-WORKFLOWS.md` reflects any CI or release job changes introduced by the feature.

### Documentation

1. `README.md` is updated to describe the modular viz architecture at a high level, including the existence and purpose of the standalone harness and how to run the browser-based viz tests.
2. `tooling/ARCHITECTURE.md` is updated to show the new package boundaries and dependency direction after extracting the shared viz backend and adding the harness package.
3. `docs/developer/ARCHITECTURE.md` is updated so the detailed package map and data-flow diagrams match the new implementation.
4. `docs/developer/CI-WORKFLOWS.md` is updated if CI or release workflow behaviour changes as part of the feature.
5. Any package-level README files affected by the extraction are updated so contributors can tell where viz rendering, viz-model production, browser harness responsibilities, and local Playwright workflow expectations now live.

---

## Non-Goals

- full browser-based editing of `.stm` files
- feature parity with every VS Code panel unrelated to mapping visualization
- deployment of a hosted public viewer
- semantic-token-perfect browser highlighting on day one
- Playwright execution in GitHub Actions for this feature
- replacing existing unit tests for `tooling/satsuma-viz/` or contract tests for `tooling/satsuma-viz-model/`

---

## Risks

1. **LSP assumptions may be embedded in the viz model path.** Extracting the backend may reveal hidden coupling to LSP-specific types or indexing choices.
2. **Layout-heavy UI can be flaky under automation.** Without explicit ready hooks and stable selectors, Playwright tests may become expensive and brittle.
3. **Syntax highlighting can distract from the core goal.** The testing goal is visualisation behaviour, not perfect editor-equivalent highlighting. The harness should avoid blocking on this unless it materially improves test quality.
4. **Parallel implementations would reduce test value.** If the harness reimplements VizModel production logic instead of sharing it, the tests become less trustworthy as production regression coverage.

---

## Documentation and Implementation Notes

1. Read `tooling/ARCHITECTURE.md` before implementation and use it to validate the final dependency direction.
2. Treat this feature as an architectural change, not just a UI addition; the package map and data flow must be updated as part of the work.
3. Prefer parser-backed fixture handling and shared indexing over text-only shortcuts.
4. Use canonical examples wherever practical so browser tests validate real Satsuma usage patterns.

---

## Suggested Follow-on ADR Question

This feature may warrant an ADR if the extraction introduces a new long-lived shared package and materially changes the dependency graph under `tooling/`.

The ADR question would be:

**Should VizModel production and viz-oriented workspace indexing live in a dedicated shared backend package rather than in `satsuma-lsp`?**
