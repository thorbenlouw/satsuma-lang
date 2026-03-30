# Feature 22 — Language Simplification: Implementation Plan

> Tracks all implementation work for the [PRD](PRD.md).
> Each item maps to a `tk` ticket. Dependencies are encoded in the ticket graph.

---

## Phase 1 — Canonical Field References (CLI only, non-breaking)

- [ ] **P1.1** Create `canonicalRef()` utility in `tooling/satsuma-cli/src/canonical-ref.ts`
- [ ] **P1.2** Update `extract.ts` (`pathText()`, `extractArrowRecords()`) to use `canonicalRef()`
- [ ] **P1.3** Update `index-builder.ts` to store qualified keys
- [ ] **P1.4** Update all 16 command files to emit canonical refs in JSON and text output
- [ ] **P1.5** Update `nl-ref-extract.ts` ref classification to use canonical form
- [ ] **P1.6** Update CLI test snapshots for canonical ref format (~200+ tests)

## Phase 2 — Multi-Source Arrow Syntax (grammar + CLI, non-breaking)

- [ ] **P2.1** Extend `map_arrow` in `grammar.js` to accept `commaSep1(src_path)`
- [ ] **P2.2** Add corpus test file `multi_source_arrows.txt`
- [ ] **P2.3** Update `ArrowRecord` type: `source` -> `sources: string[]`
- [ ] **P2.4** Update extraction in `extract.ts` for multi-source arrows
- [ ] **P2.5** Update commands: `arrows`, `mapping`, `graph`, `lineage`, `validate`
- [ ] **P2.6** Add canonical example `.stm` file with multi-source arrows
- [ ] **P2.7** Update `SATSUMA-V2-SPEC.md` with multi-source arrow syntax

## Phase 3 — Grammar Simplification (grammar + CLI + VS Code, breaking for CST consumers)

- [ ] **P3.1** Metadata simplification: replace 13 `_kv_value` forms with `value_text` greedy rule
- [ ] **P3.2** Pipe step simplification: replace with `fragment_spread | map_literal | pipe_text`
- [ ] **P3.3** Map entry simplification: `map_key_text : map_value_text` greedy capture
- [ ] **P3.4** Unified escaping: align `backtick_name` and `nl_string` escape patterns, add `\@`
- [ ] **P3.5** Update all corpus test CST expectations for simplified node types
- [ ] **P3.6** Update `meta-extract.ts` for simplified `tag_with_value` extraction
- [ ] **P3.7** Update `extract.ts` pipe step classification
- [ ] **P3.8** Switch `nl-ref-extract.ts` from backtick regex to `@ref` extraction
- [ ] **P3.9** Update VS Code LSP server CST node type references
- [ ] **P3.10** Update TextMate grammar patterns

## Phase 4 — Unify Quotes / Drop Single Quotes (grammar + CLI + VS Code + examples, breaking)

- [ ] **P4.1** Replace `quoted_name` with `backtick_name` in grammar label positions
- [ ] **P4.2** Update all corpus tests: `'label'` -> `` `label` ``
- [ ] **P4.3** Update `labelText()` in `extract.ts` and `format.ts`
- [ ] **P4.4** Update VS Code TextMate and LSP `quoted_name` references
- [ ] **P4.5** Migrate all `examples/*.stm` files (95+ single-quote instances)
- [ ] **P4.6** Update `SATSUMA-V2-SPEC.md` sections 2.2, 2.3

## Phase 5 — Elevate NL Refs to Structural Sources (CLI only, non-breaking)

- [x] **P5.1** Change `hidden-source-in-nl` from warning to error in `lint-engine.ts`
- [x] **P5.2** Add `lint --fix` auto-fix: insert undeclared `@ref` mentions into source declarations
- [x] **P5.3** Update `graph-builder.ts` to emit `@ref` edges as first-class `schema_edges`
- [x] **P5.4** Update `lineage.ts` to traverse `@ref` edges

## Cross-Cutting — Documentation

- [x] **DOC.1** Update `AI-AGENT-REFERENCE.md`: `@ref` convention, simplified grammar EBNF, updated cheat sheet
- [x] **DOC.2** Update `SATSUMA-CLI.md`: canonical ref format, `@ref` output, multi-source arrow output
- [x] **DOC.3** Update `DISCOVERED-REQUIREMENTS.md`: mark resolved requirements

---

## Dependency Graph

```
P1.1 ──> P1.2 ──> P1.3 ──> P1.4 ──> P1.5 ──> P1.6
                                                  │
P2.1 ──> P2.2 ──> P2.3 ──> P2.4 ──> P2.5 ──> P2.6 ──> P2.7
  │                                               │       │
  │                                               ├───────┤
  │                                               v       │
  │                                             P5.1 ──> P5.2 ──> P5.3 ──> P5.4
  │                                               │
  v                                               v
P3.1 ──> P3.2 ──> P3.3 ──> P3.4 ──> P3.5 ──────────────────────────────────┐
  │                                   │                                      │
  v                                   v                                      v
P3.6 ──> P3.7 ──> P3.8 ──> P3.9 ──> P3.10 ──> P4.1 ──> P4.2 ──> P4.3 ──> P4.4 ──> P4.5 ──> P4.6
                                                                                       │
                                                                                       v
                                                                              DOC.1, DOC.2, DOC.3
```

**Parallel tracks:** P1.x and P2.x can run simultaneously. P5.x can run alongside P3.x/P4.x (after P2 merges).
