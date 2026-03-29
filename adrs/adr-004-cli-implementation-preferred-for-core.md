# ADR-004 — CLI Implementation Preferred as Base for satsuma-core Extraction

**Status:** Accepted
**Date:** 2026-03 (Feature 26)

## Context

When moving extraction logic into `satsuma-core`, both the CLI and LSP implementations exist as starting points. They have different strengths:

- **CLI implementation** (`satsuma-cli/src/extract.ts`, 861 lines): more complete, handles more edge cases, has cycle detection in spread resolution, is covered by ~27 CLI test files including integration tests against real `.stm` examples.
- **LSP implementation** (`vscode-satsuma/server/src/viz-model.ts`, 1219 lines): handles LSP-specific concerns (source locations as LSP `Range`, comments, notes, metadata for rendering), but is less complete on edge cases.

The two implementations produce structurally similar but not identical outputs — the LSP adds location/comment/notes enrichment that the CLI does not, and the CLI produces semantic records that the LSP does not.

## Decision

The CLI's extraction implementation is the base for `satsuma-core`. Where the two implementations differ:
1. The CLI's logic is ported to `satsuma-core` as-is
2. The LSP's `viz-model.ts` is refactored to call `satsuma-core` functions and then add LSP-specific enrichment (source locations, notes, comments, metadata rendering) on top

This means the LSP's `buildVizModel` becomes a mapping layer: core extraction → LSP enrichment → `VizModel`. It does not lose any LSP-specific functionality; it just no longer re-implements the structural extraction.

## Consequences

**Positive:**
- The richer, more tested implementation becomes the canonical one
- Cycle detection and edge-case handling in spread resolution apply to both consumers
- The LSP extraction subtleties (LSP `Range` objects) are preserved in the mapping layer where they belong

**Negative:**
- The LSP migration is more work: `viz-model.ts` must be substantially refactored, not just updated to import from core
- A cross-check test is needed to verify that the core extractor + LSP mapping layer produces equivalent output to the old `viz-model.ts` for the same fixture
