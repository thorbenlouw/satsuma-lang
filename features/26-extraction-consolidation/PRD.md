# Feature 26 — Extraction Consolidation: Eliminate CLI/LSP Duplication

> **Status: Scheduled — tickets created (sl-8pj3, sl-sado, sl-kuos, sl-ikzl, sl-fgqt, sl-pxw5, sl-n4wb, sl-60gz, sl-ysy4, sl-s1gt, sl-r5jk)**

## Problem

The CLI (`satsuma-cli`) and the LSP server (`vscode-satsuma/server`) both independently parse and extract the same Satsuma constructs from the CST — schemas, fields, mappings, arrows, metrics, fragments, fragment spreads, and import paths. They share no code. The two implementations have drifted and will continue to drift: every grammar change requires fixes in two places, and any improvement to extraction logic (e.g. better spread resolution, new field constraint support) must be applied twice.

**Quantified duplication** (approximate line counts, as of the audit in March 2026):

| Logic | CLI (`extract.ts` et al.) | LSP (`viz-model.ts`) | Shared |
|---|---|---|---|
| CST helper functions | ~42 lines | ~26 lines | 0 |
| Schema/field extraction | ~260 lines | ~170 lines | 0 |
| Mapping/arrow extraction | ~220 lines | ~200 lines | 0 |
| Metric extraction | ~60 lines | ~70 lines | 0 |
| Fragment extraction | ~50 lines | ~80 lines | 0 |
| Fragment spread resolution | ~243 lines | ~50 lines | 0 |
| Import path resolution | ~25 lines | ~26 lines | 0 |
| **Total** | **~900 lines** | **~622 lines** | **0** |

Beyond duplication, the LSP is missing functionality that exists only in the CLI:

- **NL `@ref` resolution** (`nl-ref-extract.ts`, 599 lines) — the CLI traces implicit field lineage from natural-language transform strings; the LSP cannot
- **Field-level lineage** (`commands/field-lineage.ts`) — upstream/downstream per-field traces; absent from the LSP entirely
- **Schema-level lineage traversal** (`commands/lineage.ts`) — absent from the LSP

As a result, the viz cannot show NL-derived edges, and the field-lineage panel in VS Code relies on shelling out to the CLI rather than using in-process logic.

### Nested field handling is the sharpest edge of this problem

Satsuma schemas support arbitrarily nested record and list-of-record fields. Every feature that works with fields — coverage, field lineage, viz model, completions, hover — must recurse through this tree correctly. As of March 2026, each component handles nesting independently and inconsistently:

- **`satsuma-cli` `fields.ts`** — `filterUnmappedFields()` recurses correctly; a record field is kept with only its unmapped children if some are mapped
- **`satsuma-cli` `extract.ts`** — `extractFieldTree()` fully recurses
- **LSP `workspace-index.ts`** — `extractFields()` recurses correctly into `FieldInfo.children`
- **LSP `viz-model.ts`** — `extractFieldEntries()` recurses correctly into `FieldEntry.children`
- **LSP `coverage.ts`** (new, March 2026) — `buildFieldCoverage()` recurses via `FieldInfo.children`; arrow path collection in `collectBodyPaths()` handles `each_block` and `flatten_block` nesting
- **LSP `fieldLocations` handler** — *does not recurse*; returns only top-level fields. Callers that relied on it for coverage saw no decorations on nested fields.

That last item was a live bug: the coverage tool showed no decorations on nested fields because `fieldLocations` was flat. It was fixed in the same session by moving coverage computation into the LSP server where the full `FieldInfo` tree is available. But the fix is local to `coverage.ts` — the same `fieldLocations` handler is still used by other features and remains silently flat.

The deeper issue: every time a new LSP feature touches fields, the author must independently implement (or forget to implement) the recursion. With a shared `satsuma-core` extraction module, nested field traversal is implemented once, with one set of tests, and all consumers get correct behavior by construction.

## Goal

Establish `satsuma-core` as the single source of truth for all Satsuma AST extraction logic. Both the CLI and the LSP server become consumers of this shared module. The extraction code is written once, tested once, and updated once.

## Success Criteria

1. `satsuma-core` exports a stable extraction API covering schemas, fields (with full recursive nesting), mappings, arrows, metrics, fragments, spreads, and import entries.
2. `satsuma-cli`'s extraction layer is deleted and replaced with calls to `satsuma-core`.
3. The LSP server's `viz-model.ts` extraction layer is deleted and replaced with calls to `satsuma-core`.
4. All existing CLI tests and LSP server tests continue to pass without modification to their assertions.
5. The LSP server can produce NL-derived field edges in the `VizModel` by reusing `satsuma-core`'s NL ref resolution, so the viz can render them.
6. No net regression in CLI output correctness or LSP feature coverage.

## Non-Goals

- Changing the external CLI JSON output format (the `satsuma graph --json` schema is stable and must not change).
- Changing the `VizModel` interface consumed by `@satsuma/viz` (the viz component is a separate concern).
- Merging the CLI and LSP into a single process.
- Replacing the ELK-based layout or any rendering logic.
- Porting the web component or any frontend code.

## Proposed Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  satsuma-core  (shared extraction + resolution library)              │
│                                                                      │
│  cst-utils.ts        — child(), children(), labelText(), etc.        │
│  extract.ts          — extractSchemas(), extractMappings(),          │
│                         extractArrows(), extractMetrics(),           │
│                         extractFragments()                           │
│  spread-expand.ts    — expandSpreads(), expandEntityFields()         │
│  nl-ref-extract.ts   — extractBacktickRefs(), resolveAllNLRefs()     │
│  import-resolve.ts   — resolveImportUri(), getImportReachableUris()  │
└──────────────────────────────────────────────────────────────────────┘
         ↑                                      ↑
         │                                      │
┌────────┴────────────┐              ┌──────────┴──────────────────────┐
│  satsuma-cli        │              │  vscode-satsuma (LSP server)    │
│                     │              │                                 │
│  Calls core         │              │  Calls core extract.ts for      │
│  extraction fns     │              │  viz-model, drops own           │
│  instead of local   │              │  duplicate extraction code      │
│  extract.ts         │              │                                 │
│                     │              │  workspace-index.ts uses core   │
│  Deletes ~900 lines │              │  import-resolve.ts              │
│  of own extraction  │              │                                 │
│                     │              │  viz-model.ts uses core         │
│  graph.ts,          │              │  nl-ref-extract.ts to add       │
│  field-lineage.ts,  │              │  NL-derived edges to VizModel   │
│  lineage.ts remain  │              │                                 │
│  (orchestration     │              │  Deletes ~622 lines of own      │
│  only)              │              │  duplicate extraction code      │
└─────────────────────┘              └─────────────────────────────────┘
```

## Implementation Plan

### Phase 1 — Extract CST helpers into `satsuma-core`

Move `child()`, `children()`, `labelText()`, `stringText()`, `allDescendants()` from both the CLI's `extract.ts` and the LSP's `parser-utils.ts` into `satsuma-core/src/cst-utils.ts`. Both consumers import from there.

**Risk:** Low. Pure utility functions with no side effects.
**Tests:** Existing tests cover all call sites transitively.

### Phase 2 — Move core extraction to `satsuma-core`

Port the following from the CLI (the richer, more complete implementation) into `satsuma-core`:

- `extractSchemas()` / `extractFields()` — must recurse into `record` and `list_of record` children, preserving depth and parent path
- `extractMappings()` / `extractArrows()` — must handle `each_block` and `flatten_block` nesting, collecting paths at every level
- `extractMetrics()`
- `extractFragments()`
- `expandSpreads()` / `expandEntityFields()` from `spread-expand.ts`

The core field extraction API must expose the full nested `FieldNode` tree, not a flattened list. Callers that need a flat list can flatten themselves; callers that need paths (coverage, lineage, completions) can walk the tree with prefix accumulation. This is the key design constraint that prevents the `fieldLocations`-style footgun from recurring.

The CLI's extraction is preferred as the base because it is more complete (has cycle detection in spread resolution, handles more edge cases, is more thoroughly tested with the fixture corpus).

The LSP's `viz-model.ts` extraction code is deleted. `buildVizModel` is refactored to call `satsuma-core` extraction functions and adapt their output to `VizModel` shape (adding `location`, `comments`, `notes`, `metadata`, and workspace-index lookups which are LSP-specific concerns).

**Risk:** Medium. The CLI and LSP extraction functions have different signatures and output types. A mapping layer will be needed in each consumer to translate `satsuma-core` output types to their own formats. The key invariant to preserve: the CLI's `graph --json` output format must not change.

**Tests:** Both CLI integration tests and LSP server unit tests must all pass after the migration. Add a cross-check test that runs the same `.stm` fixture through both the core extractor and the old CLI path and asserts identical output.

### Phase 3 — Move import resolution into `satsuma-core`

The CLI and LSP both independently resolve `import ... from "path"` statements to file URIs. Move this into `satsuma-core/src/import-resolve.ts`.

The LSP's `getImportReachableUris()` and `resolveImportUri()` in `workspace-index.ts` are replaced with calls to `satsuma-core`.

**Risk:** Low. Small, well-tested functions.

### Phase 4 — Port NL ref extraction into `satsuma-core`

Move `nl-ref-extract.ts` (599 lines) from `satsuma-cli` into `satsuma-core`. The CLI becomes a consumer. The LSP gains access to NL ref resolution for the first time.

Update `buildVizModel` to call `resolveAllNLRefs()` from core and attach NL-derived edge annotations to `ArrowEntry.transform` in the `VizModel`. The viz component can then render these edges with a distinct visual treatment (dashed line or "NL-derived" badge).

**Risk:** Medium-high. NL ref resolution has complex heuristics and a large test suite in the CLI. Porting without regression requires careful test coverage. The LSP adding NL-derived edges to `VizModel` may expose bugs in the NL resolver that were previously invisible because they only affected the CLI's `--json` output.

**Tests:** Port the CLI's NL ref tests into `satsuma-core`. Add new LSP server tests asserting that `buildVizModel` includes NL-derived edge annotations. Add viz snapshot tests showing NL-derived edges rendered distinctly.

### Phase 5 — Remove dead code

After Phases 1–4:

- Delete `satsuma-cli/src/extract.ts` (extraction logic only; orchestration functions remain)
- Delete `satsuma-cli/src/spread-expand.ts`
- Delete the extraction portion of `vscode-satsuma/server/src/viz-model.ts` (~400 lines)
- Delete the extraction portion of `vscode-satsuma/server/src/workspace-index.ts` (import resolution)
- Update `satsuma-core`'s `package.json` to export the new modules
- Run `npm audit` and `npm test` in all three packages

## What This Does Not Fix

The following gaps are out of scope for this PRD but noted for future work:

- **Fixing `satsuma/fieldLocations`** — the LSP handler currently returns only top-level fields (a flat list). It is used by code lens and any future feature that needs field positions. It should be updated to return the full nested tree, or replaced with a call to `satsuma-core`'s field extractor. Low-risk but should be done as part of Phase 2 while the extraction is being unified.

- **Field-level lineage in the LSP** — `satsuma-cli/src/commands/field-lineage.ts` implements per-field upstream/downstream lineage. After Phase 4, this logic becomes available in `satsuma-core` and could be surfaced as a new LSP request handler and VS Code command. Tracked separately.

- **Schema-level lineage in the LSP** — `satsuma-cli/src/commands/lineage.ts` traverses the schema dependency graph. Same opportunity post-Phase 4.

- **Using `satsuma graph --json` as a viz data source** — The CLI's workspace-scoped graph is a richer data format than the per-file `VizModel`. Long-term, the viz could filter the CLI graph per-file rather than building its own model. This is a larger architectural change deferred pending real-world usage data.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CLI output format changes during migration | Low | High | Add a golden-output test that snapshots `graph --json` for all example files before migration begins |
| LSP extraction subtly differs from CLI (e.g. spread handling, nesting depth) | Medium | Medium | Cross-check test comparing core extractor output against old CLI output on the full examples/ corpus; include deeply nested fixture |
| NL resolver has latent bugs exposed by LSP context | Medium | Low | Port NL resolver tests before removing CLI's own copy; treat new failures as pre-existing bugs to fix |
| satsuma-core becomes a monolithic extraction library | Low | Medium | Keep the module split fine-grained (one file per concern); don't merge `cst-utils`, `extract`, `nl-ref-extract` into a single file |

## Acceptance Tests

1. `satsuma graph --json examples/` produces byte-for-byte identical output before and after the migration.
2. All LSP server tests pass (278+ as of March 2026).
3. All CLI integration tests pass.
4. `buildVizModel` for `examples/sfdc_to_snowflake.stm` produces a `VizModel` where the `amount_usd` arrow's `transform` includes an NL-derived annotation referencing `fx_spot_rates`.
5. `satsuma/mappingCoverage` for a schema with `list_of record` fields returns entries for nested fields at every depth level.
6. `satsuma/fieldLocations` returns the full nested field tree (not just top-level fields).
7. `npm audit` reports no new high/critical vulnerabilities in any package.
