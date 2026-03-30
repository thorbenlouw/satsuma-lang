# ADR-018 — @satsuma/viz-model as Cross-Package Protocol Contract

**Status:** Accepted
**Date:** 2026-03 (retrospective, PR #135 / sl-1myj)

## Context

The mapping visualization (ADR-012) involves two packages that must agree on a data shape:

- **Producer** — the LSP server (`tooling/vscode-satsuma/server/`) builds the visualization model from the workspace index and passes it to the webview.
- **Consumer** — the viz components (`tooling/satsuma-viz/`) receive the model and render it.

Initially, both packages defined their own copies of the VizModel types (`vscode-satsuma/server/viz-model.ts` and `satsuma-viz/model.ts`). These were manually kept in sync, but any drift between them would cause silent data mismatches at runtime — the TypeScript compiler couldn't catch cross-package type inconsistencies since each package compiled independently.

## Decision

Extract the shared VizModel types into a dedicated package: `@satsuma/viz-model` (`tooling/satsuma-viz-model/`). This package contains only TypeScript type definitions and interfaces — no runtime code. Both the LSP server and the viz components depend on `@satsuma/viz-model` as the single source of truth for the protocol contract.

The original type files in both consumer packages were reduced to re-export shims pointing at `@satsuma/viz-model`.

## Consequences

**Positive:**
- Type changes are made in one place and enforced by the TypeScript compiler across both consumers
- The protocol contract is explicitly named and versioned as a package, making it visible in the dependency graph
- Future consumers of the VizModel (e.g., a standalone viewer, a CI reporter) can depend on the same contract

**Negative:**
- Adds a package to the monorepo with its own `package.json`, build step, and CI cache entry
- For a contract that is currently consumed by exactly two packages, a shared package may feel heavyweight — a simpler alternative would be a shared `.d.ts` file
