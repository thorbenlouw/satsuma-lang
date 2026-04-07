# Feature 27 — Exploratory Bug Fixes: CLI Correctness and Consistency

> **Status: COMPLETE** (2026-04-07). 48 bugs found via 8-agent exploratory QA session. After triage: 3 closed at intake (2 deferred — function classification moot due to language simplification; 1 not-a-bug per ADR-008). All 45 implementation tickets across waves 1–8 are closed; the only remaining open ticket is `sl-cf9t` (symbol-level import reachability, in progress). Audit verified against `.tickets/` and git log on 2026-04-07.

## Goal

Fix the 43 open bugs discovered during a systematic exploratory QA sweep of the Satsuma CLI. Prioritise shared root causes (one fix closes many tickets), regressions (previously fixed bugs that returned), and high-impact correctness issues.

---

## Problem

The Satsuma CLI is the structural foundation for agent-driven data mapping workflows. Agents compose CLI commands into multi-step pipelines and rely on JSON output being correct, consistent, and complete. The bugs undermine this in several ways:

- **Silent data loss** — the formatter drops comments from metric, schema, mapping, and transform bodies (5 tickets).
- **Broken features** — `lint --fix` applies zero fixes (regression). `diff` misses transform, note, and metric metadata changes. `field-not-in-schema` validation is dead code.
- **Inconsistent output** — namespace-qualified names differ across commands. JSON uses `row` in some commands, `line` in others. `lineage` uses `src/tgt`, `graph` uses `from/to`.
- **Grammar gaps** — nested `each`/`flatten` blocks rejected despite spec allowing them. Most reserved keywords accepted as bare identifiers.
- **Graph gaps** — NL-derived edges missing for namespace-qualified workspaces. `--namespace` filter leaks orphan edges.
- **Doc bugs** — SATSUMA-CLI.md documented `fragment_spread` as a graph edge role, contradicting ADR-008 (fragments are macros, not graph entities). Fixed in this feature's prep work.

### Triage decisions (already applied)

| Ticket | Decision | Reason |
|--------|----------|--------|
| sl-xy4s, sl-lzcp | **Deferred** (closed) | Function names planned for removal from language; only NL and `...transform` spreads will remain |
| sl-95jv | **Invalid** (closed) | Per ADR-008, fragments are macros, not graph entities. SATSUMA-CLI.md was wrong — already fixed |
| sl-cf9t, sl-r2nx | **Re-opened** | Prior triage was wrong. ADR-022 keeps file-based workspace scope, but imported symbols now bring only their exact transitive dependencies rather than exposing a flat whole-file graph |

---

## Wave 1: Shared Root Causes + Regressions (8 tickets)

One fix per root cause; maximum tickets closed per unit of effort. Regressions indicate missing test coverage.

### 1A. Formatter drops first-child and trailing comments in block bodies

**Tickets:** sl-h3tu (schema), sl-ztet (mapping), sl-1kzh (metric), sl-17lk (transform), sl-necw (nested record)
**File:** `tooling/satsuma-core/src/format.ts`

In `formatSchemaBody()`, `formatMappingBody()`, and equivalent metric/transform body formatters, blank-line logic only triggers when `prev !== null`. Comments that are the first child of a block body have no `prev` reference and are silently skipped. Trailing comments after the last named child are also missed.

**Impact:** Silent data loss — `//`, `//!`, `//?` comments disappear on `satsuma fmt`.

**Acceptance criteria:**
1. Comments at the start of schema, mapping, metric, transform, and nested record bodies survive formatting.
2. Trailing comments at the end of any block body survive formatting.
3. All three comment types (`//`, `//!`, `//?`) are preserved.
4. Round-trip idempotency: formatting twice produces zero diff on second pass.
5. All existing formatter tests pass; new tests cover first-child and trailing comments in each block type.

### 1B. Regression: lint --fix applies zero fixes

**Ticket:** sl-1wpy (regression of closed sl-v8qi)
**File:** `tooling/satsuma-cli/src/lint-engine.ts` (`applyFixes`, lines 446-481)

`hidden-source-in-nl` findings are marked `fixable: true` but `--fix` reports `fixed: 0`, the `fixes` array is empty, and the file is unchanged.

**Acceptance criteria:**
1. `lint --fix` adds the missing schema to the `source { }` block when `hidden-source-in-nl` fires.
2. The fixed file passes `satsuma validate`.
3. Running `lint --fix` a second time reports zero findings (idempotent).
4. Regression test added that will fail if --fix breaks again.

### 1C. Regression: lint labels metric note findings as 'mapping' scope

**Ticket:** sl-j9ew (regression of closed sl-fl3u)
**File:** `tooling/satsuma-cli/src/lint-engine.ts`

When `unresolved-nl-ref` fires inside a metric's note block, the diagnostic message says `in mapping 'note:metric:revenue'` instead of `in metric 'revenue'`.

**Acceptance criteria:**
1. Lint findings in metric contexts use `in metric '<name>'` scope label.
2. Regression test added.

---

## Wave 2: Diff Command Rework (5 tickets)

The diff command is the most broken individual command — it misses entire categories of changes.

**Tickets:** sl-edrw, sl-van1, sl-fkwb, sl-1meq, sl-dsp4
**Files:** `tooling/satsuma-cli/src/diff.ts`, `tooling/satsuma-cli/src/commands/diff.ts`

| Ticket | Problem |
|--------|---------|
| sl-edrw | Arrow transform/pipeline changes not detected — only endpoints compared |
| sl-van1 | Mapping note block changes not detected (regression of closed sl-18hw) |
| sl-fkwb | Schema `note {}` block content misinterpreted as field operations |
| sl-1meq | Metric source, grain, and slice changes not detected |
| sl-dsp4 | JSON output includes undocumented `notes` key (always empty) |

**Root cause:** `diffMapping()` and `diffSchema()` compare structural endpoints but not sub-block content. The `diffBlockMap` generic comparison stops at the block boundary.

**Acceptance criteria:**
1. Arrow transform changes (structural, NL, mixed) detected and reported as `arrow-transform-changed`.
2. Note block additions, removals, and text changes detected in both schemas and mappings.
3. Schema `note {}` blocks not misinterpreted as field operations.
4. Metric `source`, `grain`, and `slice` changes detected.
5. JSON output shape documented and matches actual output.
6. Regression tests for each change type.

---

## Wave 3: Graph and Lineage Gaps (6 tickets)

### 3A. Graph: zero nl-derived edges for namespace-qualified workspaces

**Ticket:** sl-h3wi
**File:** `tooling/satsuma-cli/src/graph-builder.ts` (lines 64-109), `commands/graph.ts` (lines 585-640)

Mapping key construction during NL ref resolution doesn't match the key format in `index.mappings` for namespaced workspaces.

**Acceptance criteria:**
1. `graph --json` for `examples/namespaces/` produces nl-derived field edges.
2. `nl-refs` count and graph nl-derived edge count are consistent for namespace-qualified workspaces.

### 3B. Graph --namespace filter leaks orphan edges

**Ticket:** sl-p895
**File:** `tooling/satsuma-cli/src/commands/graph.ts`

**Acceptance criteria:**
1. Every `from`/`to` in `edges` and `schema_edges` references a node present in the `nodes` array.
2. Cross-namespace edges are either included with both endpoints or excluded entirely.

### 3C. Lineage --depth includes dangling node beyond limit

**Ticket:** sl-ee6o
**File:** `tooling/satsuma-cli/src/commands/lineage.ts` (buildDownstream, lines 138-162)

**Acceptance criteria:**
1. Every non-leaf node in `lineage --json` output has at least one outgoing edge.
2. `--depth 1` on A->B->C->D shows A->(mapping)->B and stops.

### 3D. Lineage/graph JSON consistency

**Tickets:** sl-em2p, sl-m9v9, sl-mraa

| Issue | Fix |
|-------|-----|
| sl-em2p | Standardize edge property names across lineage and graph |
| sl-m9v9 + sl-mraa | Distinguish declared vs nl-derived arrow counts in graph stats |

**Acceptance criteria:**
1. Edge property names consistent between `lineage --json` and `graph --json`.
2. `graph --json` stats clearly distinguish declared vs nl-derived arrow counts.

---

## Wave 4: Parser and Grammar (5 tickets)

### 4A. Grammar rejects nested each/flatten blocks

**Ticket:** sl-s6gs
**File:** `tooling/tree-sitter-satsuma/grammar.js`

Spec section 4.4 shows nested `each` as valid syntax.

**Acceptance criteria:**
1. Nested `each` inside `each`, `flatten` inside `each`, and `each` inside `flatten` all parse.
2. Corpus test cases for each nesting combination.
3. CLI commands work with nested blocks.

### 4B. Comments in source/target blocks parsed as schema references

**Ticket:** sl-bi92
**File:** `tooling/tree-sitter-satsuma/grammar.js` or `tooling/satsuma-core/src/extract.ts`

**Acceptance criteria:**
1. `source { schema_a // comment\n schema_b }` parses with two schema refs and one comment.
2. `satsuma fmt` preserves comments inside source/target blocks.
3. `satsuma validate` does not report comments as undefined schemas.

### 4C. Validate: circular fragment spreads undetected

**Ticket:** sl-7krx

**Acceptance criteria:**
1. `satsuma validate` reports diagnostics for self-referencing and circular fragment spreads.
2. Fragment resolution terminates gracefully.

### 4D. Reserved keywords accepted as bare identifiers

**Ticket:** sl-kh05

Spec section 2.6 lists 14 reserved keywords but only `note` is blocked. Decision needed: enforce in grammar, or update spec to clarify keywords are soft-reserved.

**Acceptance criteria:**
1. Decision documented in spec or ADR.

### 4E. Empty backtick identifier accepted

**Ticket:** sl-1cn3

**Acceptance criteria:**
1. Empty backtick identifiers rejected at parse or validate time.

---

## Wave 5: Validate and Lint Quality (7 tickets)

### 5A. Dead code: field-not-in-schema check never fires

**Ticket:** sl-akdg
**File:** `tooling/satsuma-cli/src/commands/validate.ts` (checkArrowFieldRefs)

Mapping name format mismatch between `index.mappings` keys and `arrow.mapping` values.

**Acceptance criteria:**
1. Arrow source/target fields referencing nonexistent schema fields produce a diagnostic.
2. Nested `record`/`list` paths resolve correctly.

### 5B. lint exits 2 for warning-only findings

**Ticket:** sl-8o37

**Acceptance criteria:**
1. Lint exit codes: 0 = clean or warnings only, 1 = errors found, 2 = parse/filesystem error.

### 5C. Validate/lint rule name mismatch + duplicate diagnostics

**Tickets:** sl-4rvc, sl-tslm

**Acceptance criteria:**
1. One canonical rule name for unresolved NL refs, consistent across both commands.

### 5D. Unresolved @ref in note blocks not detected

**Ticket:** sl-vjvf

**Acceptance criteria:**
1. `unresolved-nl-ref` checks @refs in file-level notes, schema notes, and mapping notes.

### 5E. Canonical examples documentation

**Ticket:** sl-emra

Per ADR-022, CLI commands operate on file entry points, not directories. `satsuma validate examples/` is not a valid operation.

**Acceptance criteria:**
1. `examples/README.md` documents that each subdirectory is a standalone workspace with its own entry file.
2. Each example subdirectory has a clear entry file for validation (e.g., `satsuma validate examples/sfdc-to-snowflake/pipeline.stm`).
3. The two individual file warnings (multi-source, sfdc-to-snowflake) investigated and either fixed or documented.

---

## Wave 6: Namespace Consistency Pass (7 tickets)

One systematic pass to ensure namespace-qualified names are canonical everywhere.

**Tickets:** sl-ltv6, sl-qofc, sl-wfgx, sl-b0mq, sl-pb47, sl-qxn5, sl-1vnm
**Key file:** `tooling/satsuma-cli/src/index-builder.ts`

| Ticket | Problem |
|--------|---------|
| sl-ltv6 | `arrows` text header shows "0 arrows" with bare name despite body listing matches |
| sl-qofc | `mapping` text output drops namespace prefix from mapping name |
| sl-wfgx | `nl`, `meta`, `where-used`, `fields` echo query form instead of canonical name |
| sl-b0mq | `where-used --json` shows `::name` (empty namespace) for bare-name queries |
| sl-pb47 | `warnings --json` drops namespace prefix from block names |
| sl-qxn5 | NL @ref to own source field creates redundant NL-derived arrow |
| sl-1vnm | Anonymous mappings inside namespace blocks invisible to arrows/field-lineage |

**Acceptance criteria:**
1. All text output uses canonical namespace-qualified form for namespaced entities.
2. All JSON output uses resolved canonical form regardless of query form.
3. Anonymous mappings inside namespaces discoverable via arrows, field-lineage, and graph.
4. NL-derived arrows not created when @ref duplicates the arrow's own explicit source.
5. Tests use `examples/namespaces/` as fixture material.

---

## Wave 7: Explicit Import Scoping + File-Based CLI Scope (ADR-022)

**Tickets:** sl-cf9t, sl-r2nx, sl-o9mh (CLI impl), sl-mypf (core docs), sl-fa5k (website/lessons), sl-fcqc (examples/testing)
**ADR:** `adrs/adr-022-transitive-imports-file-based-cli.md`

Per ADR-022, workspace scope is file-based and directory arguments are removed. A workspace is defined by a file entry point and the exact explicitly imported symbols it brings into scope, together with their transitive dependencies. The same boundary applies in CLI, IDE, and LSP operations.

### 7A. CLI command implementation changes

**Files:** All files in `tooling/satsuma-cli/src/commands/`, `tooling/satsuma-cli/src/resolve-input.ts`

**Acceptance criteria:**
1. All commands that accept `[path]` require a `.stm` file.
2. Directory arguments produce a clear error: `"Expected a .stm file, not a directory. Try: satsuma <cmd> <file.stm>"`.
3. Semantic resolution inside the resulting workspace still respects explicit imports plus only the exact transitive dependencies those imports require.
4. Importing one symbol from a file does not make every definition in that file visible.
5. IDE/LSP operations for an active file also use only that file's import-reachable workspace, not the surrounding folder.
6. Help text and `--help` output explain the file-based model clearly.
7. CLI and LSP tests cover both file-entry workspace selection and selective transitive dependency visibility.

### 7B. Documentation updates

**Files:** `SATSUMA-CLI.md`, `AI-AGENT-REFERENCE.md`, `HOW-DO-I.md`, `CLAUDE.md`, `PROJECT-OVERVIEW.md`

**Acceptance criteria:**
1. CLI examples use file arguments, not directories.
2. Documentation distinguishes workspace scope from symbol reachability inside a file, and states that the same rule applies in IDE/LSP.

### 7C. Website and learning materials

**Files:** `site/cli.njk`, all files in `lessons/` (01, 02, 08, 09, 10, 12, 13)

**Acceptance criteria:**
1. Website CLI examples use file arguments, not directories.
2. Lesson CLI examples use file arguments.
3. Lesson content explains the file-based workspace model and selective transitive import reachability, including IDE/LSP behavior.

### 7D. Example workspaces

**Files:** All directories in `examples/`, `testing-prompts/`

**Acceptance criteria:**
1. Each example subdirectory has a clear entry file (e.g., `pipeline.stm` or the primary mapping file).
2. `examples/README.md` documents the entry file for each example.
3. Testing prompts updated to use file-based commands.
4. Skills and useful-prompts updated if they reference directory-level commands.

---

## Wave 8: Polish and JSON Consistency (12 tickets)

Low-severity fixes that improve the agent consumption experience.

| Ticket | Fix | File(s) |
|--------|-----|---------|
| sl-bjtj | Standardize JSON line numbers to `line` everywhere | Multiple command files |
| sl-xfxd | `lineage --json` not-found returns JSON error object | lineage.ts |
| sl-571v | Include metric display name in `nl` output | nl.ts |
| sl-prsy | Use schema-qualified path in `nl` JSON `parent` field | nl.ts |
| sl-2old | Strip quote characters from kv metadata string values | extract.ts |
| sl-t8b4 | Add `fieldType: null` for schema-level `find` results | find.ts |
| sl-cgpn | Update `summary --help` to document actual JSON shape | summary.ts |
| sl-wawy | Update `where-used --help` to document all `kind` values | where-used.ts |
| sl-j713 | Add `fields` array to graph metric nodes | graph.ts |
| sl-h931 | Strip internal scope prefix from `where-used` nl_ref names | where-used.ts |
| sl-dfqb | Reconcile `mapping` arrowCount with hierarchical arrows | mapping.ts |
| sl-8s4b | `summary` totalErrors reflects actual parse errors | summary.ts |

**Acceptance criteria:** Each fix has a targeted test. JSON shapes documented in `--help` match actual output.

---

## Implementation Order Summary

| Wave | Theme | Tickets | Effort | Approach |
|------|-------|---------|--------|----------|
| 1 | Shared root causes + regressions | 8 | Medium | 1 PR, 3 independent fixes |
| 2 | Diff command rework | 5 | Large | 1 PR, focused on diff.ts |
| 3 | Graph and lineage gaps | 6 | Medium | 1 PR |
| 4 | Parser and grammar | 5 | Medium | 1 PR (grammar + corpus tests) |
| 5 | Validate and lint quality | 7 | Medium | 1 PR |
| 6 | Namespace consistency | 7 | Medium | 1 PR, systematic pass |
| 7 | Selective transitive import reachability + file-based CLI scope (ADR-022) | 2 + docs | Medium | 1 PR |
| 8 | Polish and JSON consistency | 12 | Small each | 1-2 PRs |
| **Total** | | **45 + ADR-022 docs/tasks** | | **8-9 PRs** |

---

## Verification Strategy

After each wave:
1. `npm test` in `tooling/satsuma-cli/` and `tooling/satsuma-core/` — all green.
2. `npm test` in `tooling/tree-sitter-satsuma/` — all 482+ corpus tests pass (Wave 4 adds new ones).
3. `satsuma fmt --check examples/` — exit 0 (no formatting drift).
4. Re-run the specific exploratory scenario from `/tmp/satsuma-test-*/` that triggered each bug — confirm fixed.
5. Close tickets with timestamped `## Notes` per CLAUDE.md convention.

For regressions (sl-1wpy, sl-j9ew, sl-van1): add regression tests that specifically reproduce the original bug report, ensuring it cannot silently return.

---

## Related ADRs

- **ADR-008** — Fragment Spread Expansion Semantics (fragments are macros, not graph entities)
- **ADR-022** — Selective Transitive Import Reachability and File-Based Workspace Scope (new, issued with this feature)
