---
id: sl-1myj
status: closed
deps: []
links: []
created: 2026-03-30T06:28:47Z
type: chore
priority: 2
assignee: Thorben Louw
---
# extract shared VizModel types into @satsuma/viz-model package

satsuma-viz/src/model.ts and vscode-satsuma/server/src/viz-model.ts define the same VizModel type hierarchy independently. The LSP file has a 'keep in sync with...' comment, and the types have already diverged: the LSP version has atRefs?: ResolvedAtRef[] on TransformInfo and a CONSTRAINT_TAGS constant absent from satsuma-viz.

The viz web component receives VizModel as a serialised JSON payload from the LSP server. Both producer (LSP) and consumer (viz) must agree on the shape — currently enforced only by manual synchronisation.

## Design

Create a new package tooling/satsuma-viz-model/ (or add a viz-model module to an existing shared package) that exports:
- The full VizModel interface hierarchy (use LSP's version as canonical, it is the superset)
- SourceLocation, SourceBlockInfo
- ResolvedAtRef
- CONSTRAINT_TAGS constant

satsuma-viz depends on this package and removes its local model.ts definitions.
vscode-satsuma/server depends on this package and removes its duplicate type declarations.

Do NOT fold into @satsuma/core — these are LSP/client protocol types, not parsing primitives.

## Acceptance Criteria

**Correctness**
- New shared package (or module) contains all VizModel types exported from a single location
- satsuma-viz imports VizModel types from the shared package; local model.ts removed or reduced to re-exports only
- vscode-satsuma/server imports VizModel types from the shared package; duplicate declarations removed
- Both packages build cleanly with no type errors
- No 'keep in sync' comments remain — the shared package is the single source of truth

**Code quality**
- The shared module reads clearly as a self-contained contract: every interface and field has a brief doc-comment explaining its role in the protocol (Literate Programming style — the types tell the story of what the viz component renders)
- No leftover dead code, transitional shims, or commented-out old definitions

**Tests**
- Any existing type-level or integration tests that were split across viz and LSP are merged into a single suite on the shared package; redundant duplicate test cases removed
- Every test has a leading comment (or string description) stating *why* the case exists and what property it validates — not just what it does
- Test suite is lean: no two tests validate the same invariant in the same way


## Notes

**2026-03-30T11:30:00Z**

Cause: `satsuma-viz/src/model.ts` and `vscode-satsuma/server/src/viz-model.ts` independently defined the same VizModel interface hierarchy. The LSP version was the superset (adding `atRefs` on `TransformInfo`, `spreads` on `FragmentCard`, `CONSTRAINT_TAGS`), but the two had already diverged with no enforcement mechanism.

Fix: Created `tooling/satsuma-viz-model/` as a new package exporting all VizModel types and `CONSTRAINT_TAGS` from a single source. Both `satsuma-viz/src/model.ts` and `vscode-satsuma/server/src/viz-model.ts` now re-export from the shared package. The `VizModel fixture validation` test suite moved to `satsuma-viz-model/test/model.test.js`; the duplicate tests in `satsuma-viz/test/model.test.js` were removed.
