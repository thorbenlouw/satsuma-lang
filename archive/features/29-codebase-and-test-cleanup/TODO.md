# Feature 29 TODO

PRD: [PRD.md](./PRD.md)

This TODO breaks Feature 29 into small, independent cleanup tasks. Each task
should be opened as a `tk` ticket when picked up. Tasks are deliberately
parallelisable — there is no enforced ordering except where noted.

## Code cleanup

### 1. Consolidate duplicated utilities into `satsuma-core`
- [x] Audit `satsuma-cli/src/` and `satsuma-lsp/src/` for utilities that exist in both. Produced list (sl-znn1): LSP `sourceRefText` copies in `action-context.ts` (~14 lines), `completion.ts` (~16), `coverage.ts` (~14), `codelens.ts` (~13), and `definition.ts` (~11); LSP `qualifiedNameText` copy in `definition.ts` (~5); LSP `fieldNameText` / `fieldNameTextDef` copies in `symbols.ts` and `definition.ts` (~6 each); LSP `walkDescendants` local copy in `codelens.ts` (~6); CLI `qualifyField` copies in `index-builder.ts` (~35) and `field-lineage.ts` (~21); CLI `findFieldByPath` / `collectAllFieldNames` copies in `arrows.ts` (~25 combined) and `field-lineage.ts` (~22 combined).
- [x] For each duplicate, move the canonical implementation (with its tests) into `satsuma-core` and update both consumers to import from core. `sourceRefText`, `sourceRefStructuralText`, `qualifiedNameText`, `fieldNameText`, `walkDescendants`, and `resolveScopedEntityRef` already lived in core and consumers now import them; `qualifyField`, `findFieldByPath`, and `collectFieldNames` now live in core with focused tests.
- [x] Delete the consumer-side copies and their now-redundant tests. Deleted the consumer helper bodies; existing consumer tests remain because they exercise command/LSP behaviour, not duplicate helper units.
- [x] Verify the dependency graph is unchanged (no consumer → consumer imports introduced). CLI and LSP import from `@satsuma/core`; no new consumer-to-consumer imports were added.

### 2. Resolve `WorkspaceIndex` naming collision
- [x] Identify the two `WorkspaceIndex` types and document what each represents. (CLI's was an extraction-result struct: schemas/mappings/arrows/etc. produced by running extractors. viz-backend's is a definition/reference cross-file index used by the LSP and viz harness for navigation.)
- [x] Rename one — preferring the more specific name — so the two types no longer collide in IDE search/symbol navigation. (sl-erxz: renamed CLI's type to `ExtractedWorkspace`. viz-backend keeps `WorkspaceIndex` since it is the natural editor-style index. 25 files updated; all 876 CLI tests pass.)
- [x] Update all references and re-export sites.

### 3. Resolve duplicate filenames across packages *(done — sl-2513)*
- [x] List the three filenames that appear in multiple package locations. (Three intra-`satsuma-cli` collisions where the implementation file shared a name with its `commands/` wrapper: `validate.ts`, `diff.ts`, `graph-builder.ts`.)
- [x] Decide rename vs merge per file. (All three were genuinely different responsibilities — rename was correct. Renamed `cli/validate.ts` → `cli/semantic-warnings.ts`, `cli/diff.ts` → `cli/diff-engine.ts`, `cli/graph-builder.ts` → `cli/schema-graph.ts`. Importers and tests updated.)

### 4. Remove dead `resolveAndLoad` (or actually use it)
- [x] Confirm `resolveAndLoad` has no callers.
- [x] Decide between (a) deleting it and the inline reimplementations stay as-is, or (b) refactoring all ~20 commands to use it.
- [x] Chose (b) after PR 209 review feedback. Introduced `tooling/satsuma-cli/src/load-workspace.ts` exporting `loadWorkspace(pathArg)` → `{ files, index }` and migrated 18 of 21 CLI commands to use it (sl-r39t). `fmt`, `diff`, and `validate` retain custom handling because their resolve-failure semantics genuinely differ. Net ~247 lines of boilerplate removed; per-command directory-rejection integration tests consolidated into `test/load-workspace.test.ts`.

### 5. Remove or de-mark temporary shims
- [x] Grep for "temporary", "shim", "migration" in source headers across all packages.
- [x] For each: either delete the shim and update callers, or remove the temporary marker and add a comment justifying its continued existence. (sl-y0sz: rejustified `nl-ref-extract.ts` and `spread-expand.ts` as permanent WorkspaceIndex→core-callback bridges; the stale "will be collapsed in sl-n4wb" claim is gone — sl-n4wb is closed and the bridges remain by design.)

### 6. Reduce `process.exit()` usage in CLI commands *(done — sl-3291)*
- [x] Count current `process.exit()` calls and bucket them by reason. (53 inline calls across 23 files: not-found lookups, parse/IO errors, soft "no results" exits, validate/lint findings.)
- [x] Refactor command handlers to return a structured result with `exitCode`; let a single top-level dispatcher call `process.exit()` once. (Landed as `src/command-runner.ts` exposing `CommandError` + `runCommand`. Two intentional exit sites remain: the runner and an `unhandledRejection` safety net in `index.ts` for failures before dispatch.)
- [x] Update tests to assert on returned codes rather than spawning subprocesses where unit-level testing now suffices. (`errors.test.ts` and `load-workspace.test.ts` rewritten to assert thrown `CommandError`s directly, dropping all `process.exit` stub plumbing. New `command-runner.test.ts` pins the four runner branches. Integration tests unchanged — they remain the contract.)

### 7. Unify the three-headed validation pipeline *(done — sl-bxzg)*
- [x] Document where the three pipelines diverge today (core semantic diagnostics, CLI `validate`, LSP diagnostic adapter). CLI computed import reachability before core validation; the LSP combined a partial core adapter with its own missing-import pass.
- [x] Identify the smallest common interface they could all consume. Added `validateSemanticWorkspace` in `@satsuma/core` as the shared reachability-aware semantic validation entry point.
- [x] Land the unification in a dedicated PR with no behaviour change — diagnostics text and ordering must match the existing CLI integration tests exactly. CLI and LSP adapters now consume the core entry point; core/LSP/CLI checks pin the contract.

### 8. Inline "why" comments for the most complex algorithms *(done — sl-giyu)*
- [x] `resolveRef` (NL ref resolver) — annotate the cascading conditionals with a comment explaining the precedence order and why each step exists. Already had a thorough doc-comment from prior `sl-dkr7` work; verified and recorded in `sl-giyu`.
- [x] Spread expander (`spread-expand.ts`) — explain the migration plan in plain prose at the function level, not just the file header. Completed in `sl-giyu`.
- [x] `viz-model.ts` top-level `extract*` builders — for each, document the VizModel-specific enrichment that core's extraction does not provide. Completed in `sl-giyu`.
- [x] `diff.ts` comparators — document arrow identity rules, what counts as a "change" vs. "addition", and how note diffs handle multi-note targets. Completed in `sl-giyu`.
- [x] `index-builder.ts` `buildIndex` — add a function-level doc-comment explaining the assembly order and why it cannot be reordered. Completed in `sl-giyu`.

### 9. Reconcile `ARCHITECTURE.md` claims with reality
- [x] Find every claim in `ARCHITECTURE.md` of the form "consumers never X" and verify it.
- [x] Either fix the violation (preferred) or update the doc to describe reality. (sl-rovp: cardinal dependency rule verified — no upward imports exist. The temporary Known Violation note was later removed by sl-cvs2 after the duplicated CLI extraction/classification tests were consolidated into core.)

## Test cleanup

### 10. Add direct unit tests for `viz-model.ts` *(done — sl-a8je)*
- [x] Create `tooling/satsuma-cli/test/viz-model.test.ts` (or wherever the builder lives). Added `tooling/satsuma-viz-backend/test/viz-model-builders.test.js`.
- [x] For each top-level `extract*` builder (`extractSchema`, `extractMapping`, `extractMetric`, `extractArrow`, `extractEachBlock`, `extractFlattenBlock`, etc.), write tests that parse a minimal `.stm` snippet, call the builder, and `assert.deepStrictEqual` against an expected `VizModel` fragment. Builder internals are exposed through `_testInternals`.
- [x] Cover at least: schema enrichment, mapping field-coverage annotations, namespace propagation, NL-derived edge promotion in arrow extraction, each/flatten nesting.
- [x] Replace the `as unknown as CommentEntry[]` cast with a properly typed accessor while you're in the file. Added `comments: CommentEntry[]` to `FragmentCard`, populated it in `extractFragment`, and removed the cast in `findPrecedingBlock`.

### 11. De-duplicate core ↔ CLI extraction tests *(done — sl-cvs2)*
- [x] Diff `satsuma-core/test/extract.test.js` against `satsuma-cli/test/extract.test.ts`. (CLI was the broader of the two — its mock-based suite covered name forms, metadata enrichment, mapping source/target rules, namespace propagation, and import arity that core had not yet picked up.)
- [x] Migrate the missing cases into core rather than just deleting them. (Added 32 cases to `satsuma-core/test/extract.test.js` as a clearly-labelled "migrated from CLI sl-cvs2" appendix; trimmed `satsuma-cli/test/extract.test.ts` to its real-file integration suite only.)
- [x] Repeat for `classify.test.ts`. (CLI's `classify.test.ts` was a pure re-test of `@satsuma/core` `classifyTransform`/`classifyArrow` with no CLI-specific behaviour — every case was already covered by core's own `classify.test.js`. Deleted outright.) ARCHITECTURE.md "Known violation" note removed.

### 12. Add error-recovery integration tests *(done — sl-zv0o)*
- [x] Add at least 3 CLI integration tests that run `satsuma schema`, `satsuma validate`, and `satsuma fields` against a `.stm` fixture with a missing closing brace, asserting graceful output (non-crash, partial results, sensible diagnostics). Added `tooling/satsuma-cli/test/recovery.test.ts`.
- [x] Add at least 3 LSP tests that build the workspace index from sources containing `MISSING` nodes and verify hover, definition, and completion still return non-crash results. Added `tooling/satsuma-lsp/test/recovery.test.js`.

### 13. Grow grammar recovery corpus *(done — sl-xr1r)*
- [x] Add corpus cases to `recovery.txt` for: cursor mid-token, partially written arrow (`source >`), half-typed field name, broken `import` declaration (no `from` clause), unterminated string in metadata. Added these plus adjacent mid-edit cases for missing import paths, partial dash arrows, and half-typed map entries.
- [x] Target ≥15 recovery cases total. `recovery.txt` now has 15 cases.

### 14. Tighten assertion style on the highest-value tests
- [x] Pick the 10 most load-bearing extraction/classification tests and convert them from per-field `assert.equal` to `assert.deepStrictEqual` against a full expected object. (sl-d20o)
- [x] Document the convention in a short note at the top of the affected test files. (sl-d20o)

### 15. Grow thin command test files *(done — sl-pdlh)*
- [x] `summary.test.ts` — cover every flag and both text + JSON output modes. Replaced formatter-copy tests with real CLI subprocess coverage for default text, `--compact`, `--json`, and `--json --compact`.
- [x] `warnings.test.ts` — cover the diagnostic categories and severity filtering. Added real CLI coverage for default warning+question text, question-only text, default JSON, question-only JSON, and empty JSON not-found output.
- [x] `workspace.test.ts` — cover import-following, missing file handling, namespace resolution at the workspace boundary. Added resolver/loader coverage for direct and transitive imports, missing imports, directory rejection, followImports=false, and namespace-qualified loaded schemas.
- [x] `lineage.test.ts` — cover graph traversal, cycle handling, namespace scoping, and `--from` filtering. Replaced helper-copy tests with real CLI subprocess coverage for `--from`, `--to`, `--depth`, `--compact`, `--json`, namespace-qualified traversal, invalid mixed direction flags, and JSON not-found errors.

### 16. Strengthen LSP completion tests *(done — sl-yk89)*
- [x] At minimum double the case count in `completion.test.js`. Grew the suite to 18 tests.
- [x] Add tests for completion inside source blocks, target blocks, pipe chains, metadata blocks, and namespace-qualified names. Added coverage for arrow targets, namespace imports, kind tagging, and fragment/transform exclusion.
- [x] Add at least 2 cases for completion in trees containing `MISSING` nodes.

### 17. Unit tests for custom LSP requests *(done — sl-0y4a)*
- [x] One test file per custom request: `satsuma/vizModel`, `satsuma/vizFullLineage`, `satsuma/vizLinkedFiles`, `satsuma/fieldLocations`, `satsuma/mappingCoverage`, `satsuma/actionContext`. Added handler-level coverage for `vizModel`, `vizFullLineage`, and `vizLinkedFiles`.
- [x] Each file: build a workspace index from a minimal multi-file source map, invoke the handler, assert on the response shape. Added 9 tests against multi-file workspace indexes.

### 18. Raise coverage gates
- [x] Measure current coverage on `satsuma-core`, `satsuma-cli`, and `satsuma-lsp`. Measured line coverage after PR 222 and `origin/main`: core 80.96%, CLI 92.05%, LSP 88.53%.
- [x] Update `.c8rc.json` (or per-package equivalents) to set the gate to (current coverage rounded down to the nearest 5%) for each package, with a target floor of 85% for core. Added core/LSP package configs and raised CLI's existing gate: core 80%, CLI 90%, LSP 85%. Core is below the aspirational 85% floor today, so the gate follows the measured-coverage rule rather than setting CI to fail.

## Out of scope (tracked separately)

- Property-based / generative testing for the formatter and extractor.
- Viz web component test buildout.
- Smoke test (pytest BDD) expansion to cover all 22 commands.
