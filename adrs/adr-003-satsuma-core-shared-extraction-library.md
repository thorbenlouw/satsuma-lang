# ADR-003 — satsuma-core as the Shared Extraction Library

**Status:** Accepted
**Date:** 2026-03 (Feature 26)

## Context

The CLI (`satsuma-cli`) and the LSP server (`vscode-satsuma/server`) both independently parse and extract the same Satsuma constructs from the CST — schemas, fields, mappings, arrows, metrics, fragments, spreads, and import paths. As of the Feature 26 audit (March 2026), they share zero extraction code despite approximately 900 lines in the CLI and 622 lines in the LSP containing parallel implementations.

`satsuma-core` already existed as a package containing the formatter (`format.ts`) and thin type wrappers. It was already a dependency of both consumers.

Alternatives considered:
1. Keep duplication, add cross-check tests to detect drift — low effort but doesn't prevent drift
2. Make CLI a dependency of LSP server — circular risk, wrong direction (LSP should not depend on CLI's I/O layer)
3. Extract a new `satsuma-extract` package — possible but adds another package to maintain; `satsuma-core` already exists and is the right home
4. Consolidate extraction into `satsuma-core` — the chosen approach

## Decision

All pure CST extraction logic lives in `satsuma-core`. Both the CLI and the LSP server are consumers of `satsuma-core` — they never re-implement extraction.

`satsuma-core` provides:
- `cst-utils` — CST navigation helpers (`child`, `children`, `allDescendants`, `labelText`, `stringText`)
- `extract` — All single-file extraction functions (`extractSchemas`, `extractMappings`, `extractArrows`, etc.)
- `spread-expand` — Fragment spread expansion with a `EntityFieldLookup` callback interface (see ADR-005)
- `nl-ref` — NL string reference extraction (`extractBacktickRefs`, `classifyRef`)
- `classify` — Transform/arrow classification
- `canonical-ref` — Canonical reference string formatting
- `meta-extract` — Metadata block extraction
- `types` — All shared type definitions

`satsuma-core` does NOT provide:
- Parser initialization (WASM loading) — this is consumer-specific
- `WorkspaceIndex` building (multi-file orchestration) — stays in the CLI
- `VizModel` construction — stays in the LSP
- NL ref *resolution* (requires multi-file index) — stays in the CLI

## Consequences

**Positive:**
- Grammar changes require a single fix in `satsuma-core`; both CLI and LSP get the fix automatically
- The nested field recursion bug (`fieldLocations` flatness) is structurally prevented: `extractFieldTree()` is public and the only way to extract fields
- The LSP gains access to NL ref parsing (previously CLI-only) for rendering NL-derived viz edges
- New analysis tools (e.g. a future language server for another editor) can use the extraction layer without depending on CLI or LSP

**Negative:**
- `satsuma-core` becomes more complex (from ~1200 lines to ~3000+ lines)
- Both consumers must adapt their internal data pipelines to use the core types as a base and adapt to their own output formats (`WorkspaceIndex`, `VizModel`)
- The migration requires careful shim-then-delete sequencing to avoid breaking existing tests mid-migration
