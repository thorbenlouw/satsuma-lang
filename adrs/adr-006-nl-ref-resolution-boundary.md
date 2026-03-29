# ADR-006 — NL Ref Resolution Boundary: Pure Extraction in Core, Resolution in CLI

**Status:** Accepted
**Date:** 2026-03 (Feature 26)

## Context

NL strings in Satsuma transforms can contain references to other schemas and fields using `@ref` syntax or backtick delimiters (e.g. `"Look up customer in @crm_customers.id"`). The CLI traces these as implicit lineage edges — a field that mentions `@dim_date` in its transform text has an implicit dependency on `dim_date`.

The NL ref code in `satsuma-cli/src/nl-ref-extract.ts` (599 lines) has two distinct concerns:

1. **Text extraction** (`extractBacktickRefs`, `classifyRef`): parse an NL string and identify what refs are mentioned. Pure text processing — no index needed.

2. **Resolution** (`resolveRef`, `extractNLRefData`, `resolveAllNLRefs`): look up each extracted ref against the `WorkspaceIndex` to find which schema/field definition it refers to. Requires multi-file context.

The LSP needs (1) to annotate viz arrows with NL-derived references for visual rendering. It does not yet need (2) — full resolution into specific definitions.

## Decision

Split `nl-ref-extract.ts` across the boundary:

- **`satsuma-core/src/nl-ref.ts`**: exports `extractBacktickRefs` and `classifyRef`. Pure text functions. No index dependency.
- **`satsuma-cli/src/nl-ref-extract.ts`** (kept): imports the pure functions from `satsuma-core`, adds the resolution layer (`resolveRef`, `extractNLRefData`, `resolveAllNLRefs`) which requires `WorkspaceIndex`.

The LSP imports only the pure functions from `satsuma-core`. When the LSP needs full NL ref resolution in the future (e.g. for a "find all NL references to this schema" feature), that can be addressed by either:
- Moving the resolution layer to satsuma-core using the same callback abstraction pattern as spread-expand (ADR-005)
- Or shelling out to the CLI's `nl-refs` command

## Consequences

**Positive:**
- The LSP can render NL-derived edges in the viz without the full resolution machinery
- The pure extraction functions are tested once in `satsuma-core/test/nl-ref.test.js`
- The CLI's resolution layer remains unchanged — it is a consumer, not duplicator

**Negative:**
- Full NL ref resolution (who does `@crm_customers` actually resolve to?) is still CLI-only; the LSP viz shows unresolved ref text, not resolved definition locations
- If the LSP needs full resolution in the future, another migration or abstraction will be needed
