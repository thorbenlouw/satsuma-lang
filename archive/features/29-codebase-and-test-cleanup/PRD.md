# Feature 29 — Codebase and Test Cleanup

> **Status: COMPLETED** (2026-04-07)

## Goal

Address the concrete code- and test-quality issues surfaced by a thorough codebase review (see chat audit, 2026-04-05). The repository's bones are excellent — layered architecture, clean dependency direction, serious test coverage — but several mechanical issues compound into onboarding friction and coverage gaps. This feature is a deliberate **consolidation pass**: no new functionality, just removal of duplication, naming collisions, dead code, and the highest-value test-coverage gaps.

The intent is to move the codebase from a "B+ / A-" grade to a solid "A" by fixing things that are mechanical, not architectural.

---

## Problem

The 2026-04-05 audit identified two distinct categories of work:

### Code quality issues

1. **Duplicated logic across consumers.** Several utilities exist in both `satsuma-cli` and `satsuma-lsp` (and sometimes in viz code) that should live in `satsuma-core`. Per `CLAUDE.md`: "If the logic would need to be duplicated by another consumer, it belongs in core."
2. **Naming collisions.** Two unrelated `WorkspaceIndex` types share a name across packages. Three files share the same filename in different locations. These are real papercuts a new contributor hits in the first hour.
3. **Dead code.** A `resolveAndLoad` function sits unused next to ~20 commands that each reimplement workspace loading inline.
4. **Temporary shims still in place.** Migration shims that the original author flagged as temporary in their headers are still present.
5. **74 `process.exit()` calls** scattered through CLI command code, making the commands harder to test in-process and harder to compose.
6. **Three-headed validation pipeline.** Validation logic is split across core semantic diagnostics, the CLI's `validate` command, and the LSP's diagnostic adapter in ways that are partially but not fully unified.
7. **Documentation/dependency-graph drift.** `ARCHITECTURE.md` claims "consumer tests never duplicate core extraction tests," but the CLI's `extract.test.ts` and `classify.test.ts` do exactly that.
8. **Inline "why" comments are thin in the most complex code.** The NL ref resolution cascade (`resolveRef`, ~80 lines of cascading conditionals), the spread expander, and the VizModel builder are the hardest code to read and have the least inline commentary explaining intent.

### Test quality issues

1. **`viz-model.ts` has no dedicated unit tests.** The largest and most complex file in the repo (~1,370 lines, 47 functions) is only exercised indirectly through the Playwright harness and LSP tests. There are no tests that call `buildVizModel()` against a parsed tree and assert the resulting `VizModel` shape. This is the biggest single coverage gap.
2. **Core ↔ CLI test duplication.** The CLI's `extract.test.ts` (45 tests) and `classify.test.ts` (11 tests) re-test functions already covered by core's own extraction and classification tests, in violation of the architecture rule.
3. **Error-recovery integration is untested.** Grammar corpus tests prove the parser produces `MISSING` nodes on broken input, but no CLI or LSP test verifies that downstream tooling behaves correctly against those recovered trees. The architecture promises "graceful degradation over hard failures" with no end-to-end test backing it.
4. **Grammar recovery corpus is thin.** Only 6 recovery test cases for a language whose LSP encounters mid-edit broken trees on every keystroke.
5. **Verbose, non-strict assertion style.** Most core/CLI unit tests assert one field at a time (`assert.equal(result[0].name, "x")`) rather than `assert.deepStrictEqual` against a full expected object. This means tests do not catch unexpected extra fields or default-value drift.
6. **Thin coverage on user-facing commands.** `summary` (4 tests), `warnings` (3 tests), `workspace` (5 tests), `lineage` (8 tests). Workspace resolution in particular is fundamental to every command and undertested.
7. **LSP completions undertested.** `completion.test.js` has only 9 tests for one of the most context-dependent LSP features. No tests for completion in error-recovery states.
8. **Custom LSP requests have no unit tests.** `satsuma/vizModel`, `satsuma/vizFullLineage`, `satsuma/vizLinkedFiles`, `satsuma/fieldLocations`, `satsuma/mappingCoverage`, `satsuma/actionContext` are tested only through the viz harness or not at all.
9. **Smoke tests are 9% complete.** The pytest BDD smoke tier covers 2 of 22 commands (`arrows` and `lineage`). Good infrastructure, never finished.
10. **Coverage gate is modest.** `.c8rc.json` sets the line-coverage threshold to 70% for a project that almost certainly meets 85–90% on core and most CLI commands.

---

## Out of Scope

- **No new features or grammar changes.** This is purely a cleanup pass.
- **No architectural redesign.** The bones are good. The dependency direction stays as it is.
- **No formatter or parser behaviour changes.** Format idempotency and parse-tree preservation tests must continue to pass unmodified.
- **Property-based / generative testing.** Worth doing, but is its own feature — out of scope here to keep this tractable.
- **Viz component test buildout.** The viz component is undertested (41 tests for ~5,900 lines), but addressing it properly needs its own design pass for browser-side test infrastructure. Track separately.

---

## Success Criteria

1. No utility function exists in two consumer packages — any shared logic lives in `satsuma-core` with its tests.
2. No two exported types share a name across packages without a deliberate, documented reason.
3. The dead `resolveAndLoad` function is either reused by all command-loading sites or deleted.
4. Every shim flagged as "temporary" in its header is either removed or has its temporary marker removed and a comment explaining why it stays.
5. Command code paths that currently call `process.exit()` return exit codes from a single top-level dispatcher instead. (Stretch — may be split out if too large.)
6. `viz-model.ts` has direct unit tests covering each top-level `extract*` builder against parsed CST input.
7. CLI `extract.test.ts` and `classify.test.ts` no longer duplicate core coverage; the CLI keeps only the tests that exercise CLI-specific concerns (metadata edge cases, backtick handling at the command boundary).
8. At least 6 new error-recovery integration tests verify CLI and LSP behaviour against broken input.
9. Grammar `recovery.txt` corpus grows to cover mid-edit states (cursor between tokens, partially written arrows, half-typed field names, broken imports) — target ≥15 cases total.
10. The 5–6 most algorithmically complex functions (NL ref resolver, spread expander, VizModel builder entry points, diff engine comparators) gain inline commentary explaining intent and precedence rules.
11. `summary`, `warnings`, `workspace`, and `lineage` CLI tests each grow to cover their primary user-facing flags and JSON output structure.
12. LSP completion tests at least double in count and add coverage for completion in recovered/broken trees.
13. At least one unit test exists for every custom LSP request handler.
14. Coverage gate raised to 85% for `satsuma-core`; CLI and LSP gates raised to whatever they currently achieve, rounded down to the nearest 5%.
15. All tests still pass; no existing test is weakened or skipped.

---

## Notes

This work is mostly mechanical and parallelisable across many small tickets. The TODO breaks it into independent chunks so it can be picked up opportunistically rather than as one large branch.
