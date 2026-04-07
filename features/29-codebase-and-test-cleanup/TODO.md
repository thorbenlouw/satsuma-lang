# Feature 29 TODO

PRD: [PRD.md](./PRD.md)

This TODO breaks Feature 29 into small, independent cleanup tasks. Each task
should be opened as a `tk` ticket when picked up. Tasks are deliberately
parallelisable — there is no enforced ordering except where noted.

## Code cleanup

### 1. Consolidate duplicated utilities into `satsuma-core`
- [ ] Audit `satsuma-cli/src/` and `satsuma-lsp/src/` for utilities that exist in both. Produce a list with line counts.
- [ ] For each duplicate, move the canonical implementation (with its tests) into `satsuma-core` and update both consumers to import from core.
- [ ] Delete the consumer-side copies and their now-redundant tests.
- [ ] Verify the dependency graph is unchanged (no consumer → consumer imports introduced).

### 2. Resolve `WorkspaceIndex` naming collision
- [ ] Identify the two `WorkspaceIndex` types (one in CLI, one in LSP) and document what each represents.
- [ ] Rename one — preferring the more specific name — so the two types no longer collide in IDE search/symbol navigation.
- [ ] Update all references and re-export sites.

### 3. Resolve duplicate filenames across packages
- [ ] List the three filenames that appear in multiple package locations.
- [ ] For each, decide whether to merge (if they should be one file in core) or rename (if they are genuinely different responsibilities).

### 4. Remove dead `resolveAndLoad` (or actually use it)
- [ ] Confirm `resolveAndLoad` has no callers.
- [ ] Decide between (a) deleting it and the inline reimplementations stay as-is, or (b) refactoring all ~20 commands to use it.
- [ ] If (b): do it as one PR. If (a): delete and add a one-line note in `ARCHITECTURE.md` if the function was previously documented as the entry point.

### 5. Remove or de-mark temporary shims
- [ ] Grep for "temporary", "shim", "migration" in source headers across all packages.
- [ ] For each: either delete the shim and update callers, or remove the temporary marker and add a comment justifying its continued existence.

### 6. Reduce `process.exit()` usage in CLI commands *(stretch — may split)*
- [ ] Count current `process.exit()` calls and bucket them by reason (validation failure, IO error, unknown command, etc.).
- [ ] Refactor command handlers to return a structured result with `exitCode`; let a single top-level dispatcher call `process.exit()` once.
- [ ] Update tests to assert on returned codes rather than spawning subprocesses where unit-level testing now suffices.

### 7. Unify the three-headed validation pipeline *(stretch — may split)*
- [ ] Document where the three pipelines diverge today (core semantic diagnostics, CLI `validate`, LSP diagnostic adapter).
- [ ] Identify the smallest common interface they could all consume.
- [ ] Land the unification in a dedicated PR with no behaviour change — diagnostics text and ordering must match the existing CLI integration tests exactly.

### 8. Inline "why" comments for the most complex algorithms
- [ ] `resolveRef` (NL ref resolver) — annotate the cascading conditionals with a comment explaining the precedence order and why each step exists. Reference `sl-dkr7` and the relevant memory note.
- [ ] Spread expander (`spread-expand.ts`) — explain the migration plan in plain prose at the function level, not just the file header.
- [ ] `viz-model.ts` top-level `extract*` builders — for each, document the VizModel-specific enrichment that core's extraction does not provide.
- [ ] `diff.ts` comparators — document arrow identity rules, what counts as a "change" vs. "addition", and how note diffs handle multi-note targets.
- [ ] `index-builder.ts` `buildIndex` — add a function-level doc-comment explaining the assembly order and why it cannot be reordered.

### 9. Reconcile `ARCHITECTURE.md` claims with reality
- [ ] Find every claim in `ARCHITECTURE.md` of the form "consumers never X" and verify it.
- [ ] Either fix the violation (preferred) or update the doc to describe reality.

## Test cleanup

### 10. Add direct unit tests for `viz-model.ts`
- [ ] Create `tooling/satsuma-cli/test/viz-model.test.ts` (or wherever the builder lives).
- [ ] For each top-level `extract*` builder (`extractSchema`, `extractMapping`, `extractMetric`, `extractArrow`, `extractEachBlock`, `extractFlattenBlock`, etc.), write tests that parse a minimal `.stm` snippet, call the builder, and `assert.deepStrictEqual` against an expected `VizModel` fragment.
- [ ] Cover at least: schema enrichment, mapping field-coverage annotations, namespace propagation, NL-derived edge promotion in arrow extraction, each/flatten nesting.
- [ ] Replace the `as unknown as CommentEntry[]` cast with a properly typed accessor while you're in the file.

### 11. De-duplicate core ↔ CLI extraction tests
- [ ] Diff `satsuma-core/test/extract.test.js` against `satsuma-cli/test/extract.test.ts`. List overlapping cases.
- [ ] Delete the CLI duplicates. Keep CLI tests only for things core does not test (CLI metadata edge cases, backtick handling at the command boundary).
- [ ] Repeat for `classify.test.ts`.

### 12. Add error-recovery integration tests
- [ ] Add at least 3 CLI integration tests that run `satsuma schema`, `satsuma validate`, and `satsuma fields` against a `.stm` fixture with a missing closing brace, asserting graceful output (non-crash, partial results, sensible diagnostics).
- [ ] Add at least 3 LSP tests that build the workspace index from sources containing `MISSING` nodes and verify hover, definition, and completion still return non-crash results.

### 13. Grow grammar recovery corpus
- [ ] Add corpus cases to `recovery.txt` for: cursor mid-token, partially written arrow (`source >`), half-typed field name, broken `import` declaration (no `from` clause), unterminated string in metadata.
- [ ] Target ≥15 recovery cases total.

### 14. Tighten assertion style on the highest-value tests
- [ ] Pick the 10 most load-bearing extraction/classification tests and convert them from per-field `assert.equal` to `assert.deepStrictEqual` against a full expected object.
- [ ] Document the convention in a short note at the top of the affected test files.

### 15. Grow thin command test files
- [ ] `summary.test.ts` — cover every flag and both text + JSON output modes.
- [ ] `warnings.test.ts` — cover the diagnostic categories and severity filtering.
- [ ] `workspace.test.ts` — cover import-following, missing file handling, namespace resolution at the workspace boundary.
- [ ] `lineage.test.ts` — cover graph traversal, cycle handling, namespace scoping, and `--from` filtering.

### 16. Strengthen LSP completion tests
- [ ] At minimum double the case count in `completion.test.js`.
- [ ] Add tests for completion inside source blocks, target blocks, pipe chains, metadata blocks, and namespace-qualified names.
- [ ] Add at least 2 cases for completion in trees containing `MISSING` nodes.

### 17. Unit tests for custom LSP requests
- [ ] One test file per custom request: `satsuma/vizModel`, `satsuma/vizFullLineage`, `satsuma/vizLinkedFiles`, `satsuma/fieldLocations`, `satsuma/mappingCoverage`, `satsuma/actionContext`.
- [ ] Each file: build a workspace index from a minimal multi-file source map, invoke the handler, assert on the response shape.

### 18. Raise coverage gates
- [ ] Measure current coverage on `satsuma-core`, `satsuma-cli`, and `satsuma-lsp`.
- [ ] Update `.c8rc.json` (or per-package equivalents) to set the gate to (current coverage rounded down to the nearest 5%) for each package, with a target floor of 85% for core.

## Out of scope (tracked separately)

- Property-based / generative testing for the formatter and extractor.
- Viz web component test buildout.
- Smoke test (pytest BDD) expansion to cover all 22 commands.
