# Feature 28 — Pipeline Simplification: All Pipe Steps Are NL

> **Status: COMPLETE** (2026-04-07). All 9 implementation tickets (sl-3tv5, sl-95f9, sl-sp7g, sl-cxei, sl-owen, sl-thqe, sl-uu90, sl-nk6g, sl-bbuh) are closed. Audit verified against `.tickets/` and git log on 2026-04-07.

## Goal

Simplify Satsuma by removing the distinction between "structural" and "NL" pipe steps. After this change, every pipe step in a transform body `{ }` is an implicit NL string — even without enclosing `""`. The only non-NL construct allowed in a pipe chain is a `...transform` spread. The `map { }` literal remains valid as shorthand for a discrete value mapping.

This eliminates an entire classification axis (`structural` / `nl` / `mixed`), removes the concept of "known pipeline functions," and makes the language more consistent with its core principle: **natural language is a first-class citizen**.

---

## Problem

Satsuma currently has two kinds of pipe step:

1. **Structural** — bare tokens like `trim | lowercase | round(2) | validate_email | null_if_invalid`. These are "vocabulary tokens" that the spec says are interpreted by the LLM, not formally validated.
2. **NL** — quoted strings like `"Extract digits, format as E.164"`. These are natural language descriptions.

This creates several problems:

- **The distinction is artificial.** Both structural and NL steps are interpreted by an LLM or a human. `trim | lowercase` is not executed by the CLI — it's read by an agent the same way `"trim whitespace and lowercase"` is. The structural tokens are vocabulary conventions, not a programming language.
- **Classification complexity.** The CLI must classify every arrow as `structural`, `nl`, `mixed`, or `none`. This classification creates bugs (sl-xy4s: function string args misclassified), requires maintenance, and adds code paths that serve no functional purpose.
- **Mixed transforms are confusing.** `{ trim | "then apply custom logic" | lowercase }` is valid today but awkward. Is `trim` a structural step or a short NL description? Both interpretations are equally valid.
- **Function syntax creates parser ambiguity.** `round(2)`, `split("/")`, `parse("MM/DD/YYYY")` all have string arguments inside function calls, which the parser treats as NL strings. This is the root cause of multiple classification bugs.
- **The viz and field-lineage UI filter by classification.** This UI feature is built on a distinction that doesn't carry real semantic weight.

## Design Principle

From spec section 1: *"The parser is an LLM. Structure exists to delineate intent and scope — not to be exhaustively parseable by a formal grammar."*

If the parser is an LLM, then `trim | lowercase` and `"trim then lowercase"` are equivalent. The pipe `|` delimiter already separates steps — quoting each step adds ceremony without information.

---

## Decision

### What changes

1. **All pipe steps are NL.** `{ trim | lowercase | validate_email }` is now three implicit NL strings: `trim`, `lowercase`, `validate_email`. They are not recognised as function calls or vocabulary tokens by the parser or CLI.

2. **Quotes are optional on pipe steps.** `{ trim | lowercase }` and `{ "trim" | "lowercase" }` are equivalent. Quotes remain available for multi-word steps and steps containing special characters.

3. **`...transform` spreads remain.** Named transform spreads are the reuse mechanism for transform logic. They are structural (they expand to their definition) and are the only non-NL construct in a pipe chain besides `map { }`.

4. **`map { }` remains.** The map literal is a structural construct for discrete value mappings. It stays as-is.

5. **Arithmetic operators removed.** `{ * 100 }`, `{ + 1 }` are no longer valid syntax. Write `{ "Multiply by 100" }` or use a named transform.

6. **The classification axis collapses.** Every arrow is classified as one of:
   - `none` — no transform body (`src -> tgt`)
   - `nl` — has a transform body (all content is NL, possibly with `...transform` spreads or `map { }`)
   - `nl-derived` — synthetic arrow from `@ref` in NL

   The `structural` and `mixed` classifications are removed.

### What the new syntax looks like

**Before (current):**
```satsuma
EMAIL_ADDR -> email { trim | lowercase | validate_email | null_if_invalid }
PHONE_NBR -> phone { "Parse as E.164" | warn_if_invalid }
Amount -> amount_usd { "Multiply by rate from currency_rates" | round(2) }
CREATED_DATE -> created_at { parse("MM/DD/YYYY") | assume_utc | to_iso8601 }
-> migration_timestamp { now_utc() }
```

**After (simplified):**
```satsuma
EMAIL_ADDR -> email { trim | lowercase | validate email | null if invalid }
PHONE_NBR -> phone { "Parse as E.164" | warn if invalid }
Amount -> amount_usd { "Multiply by rate from currency_rates" | round to 2 decimals }
CREATED_DATE -> created_at { "Parse as MM/DD/YYYY, assume UTC, format as ISO 8601" }
-> migration_timestamp { "Current UTC timestamp" }
```

Or more concisely:
```satsuma
EMAIL_ADDR -> email { "Trim, lowercase, validate email format. Null if invalid." }
CREATED_DATE -> created_at { "Parse MM/DD/YYYY as UTC ISO 8601" }
```

The vocabulary tokens (`trim`, `lowercase`, etc.) remain valid as conventions — they're just NL now, not a separate category. Authors can still use them as shorthand when they're unambiguous.

---

## Scope of Changes

### Grammar (`tooling/tree-sitter-satsuma/grammar.js`)

1. `pipe_text` no longer needs to distinguish function calls, arithmetic operators, or parenthesized expressions as special constructs. Every token sequence between `|` delimiters (or between `{` and `}` / `|`) is a single NL step.
2. Remove arithmetic operator rules (`*`, `+`, `-`, `/` as pipe step content) or treat them as plain text within NL.
3. Corpus tests updated — existing tests with structural transforms become NL transforms.

### Core extraction (`tooling/satsuma-core/`)

1. **`classify.ts`** — Remove `structural` and `mixed` classifications. All non-empty transform bodies are `nl`. Keep `none` (no body) and `nl-derived` (synthetic from @ref).
2. **`extract.ts`** — `decomposePipeSteps()` no longer needs to distinguish step types. All steps are NL text.
3. **`format.ts`** — Formatting of pipe chains simplified. No need for `isInlinePipeChain()` heuristic based on NL presence — all chains are NL.

### CLI (`tooling/satsuma-cli/`)

1. **All commands emitting `classification`** — `arrows`, `field-lineage`, `graph`, `mapping` — stop emitting `structural` or `mixed`. Only `none`, `nl`, `nl-derived`.
2. **`nl` command** — All pipe steps are NL, so `satsuma nl` returns ALL transform content (not just quoted strings).
3. **Tests** — Update all classification assertions from `structural`/`mixed` to `nl`.

### Viz model (`tooling/satsuma-viz-model/`)

1. **`TransformInfo.kind`** — Narrow from `"pipeline" | "nl" | "mixed" | "map"` to `"nl" | "map"`.
2. **`TransformInfo.steps`** — Remove or repurpose. All step content is NL text in the `text` field.

### Viz rendering (`tooling/satsuma-viz/`)

1. **`sz-edge-layer.ts`** — Remove separate rendering branches for `"pipeline"` and `"mixed"` kinds (lines 243-246). All transforms render as NL. Remove the orange `--sz-edge-pipeline` colour; all transform edges use the NL style.
2. **`sz-mapping-detail.ts`** — Remove the `"pipeline" || "mixed"` branch (line 626) that renders steps as `<span class="transform-pipeline">`. All transforms render as NL text.
3. **`sz-overview-edge-layer.ts`** — Remove pipeline-specific stroke colour.
4. **Layout tests** — Update `kind: "pipeline"` fixtures to `kind: "nl"`.

### VS Code extension (`tooling/vscode-satsuma/`)

1. **Field lineage webview (`field-lineage.ts`)** — Remove the `ClassificationFilter` type and filter dropdown (`"structural" | "nl" | "structural+nl-derived"`). Remove `keepClassification()`. All arrows with transforms are `nl`.
2. **Field lineage CSS (`field-lineage.css`)** — Remove `.cls-structural` border/stroke/fill rules (lines 304, 325, 331). Simplify arrowhead markers to `none`, `nl`, `nl-derived` only.
3. **Lineage webview (`lineage.ts`)** — Remove `isNl` check (line 137) — all transforms are NL.
4. **Semantic tokens** — Pipe step tokens no longer need `function` or `keyword` scopes. All pipe text gets a uniform NL scope.

### LSP (`tooling/satsuma-lsp/`)

1. **`viz-model.ts`** — Simplify `coreClassificationToVizKind()`: remove `"structural"` → `"pipeline"` and `"mixed"` → `"mixed"` branches. All non-map, non-none transforms map to `"nl"`. The `extractTransform()` function simplifies — no need to separate NL text from pipeline step text; everything is NL.
2. **Semantic token scopes** — Pipe step tokens get a uniform NL scope.
3. **No import scoping changes needed** — The LSP already scopes per-file via `createScopedIndex()` + `getImportReachableUris()`. Classification changes flow through `@satsuma/core` automatically.

### Spec and docs

1. **SATSUMA-V2-SPEC.md** — Rewrite sections 4.2 (arrow declarations), 5.2 (named transforms), 7.2 (pipeline tokens). Remove the "Pipeline Tokens" table or reframe as "common vocabulary conventions" that are NL shorthand.
2. **SATSUMA-CLI.md** — Update transform classification table. Remove `structural` and `mixed`.
3. **AI-AGENT-REFERENCE.md** — Update accordingly.
4. **Examples** — Update canonical examples to use the new style. Some may keep vocabulary tokens (they're still valid NL); others may be rewritten as prose.

### Canonical examples (`examples/`)

All examples must be updated. The current corpus uses structural tokens extensively:
- `trim | lowercase` appears in ~30 arrows across the corpus
- `round(2)`, `split("/")`, `parse("...")` appear in 10+ arrows
- Arithmetic `* 100` appears in a few arrows

These can either stay as-is (they're valid NL — `trim` is just a one-word NL step now) or be rewritten to prose. The examples should demonstrate good Satsuma style post-simplification.

---

## Migration

### Backward compatibility

Existing `.stm` files are **fully backward compatible**. The change is purely how the tooling interprets pipe steps — not what syntax is valid. `{ trim | lowercase }` was valid before (as structural) and is valid after (as NL). No files need to be rewritten to remain parseable.

The only breaking changes are:
1. **Arithmetic operators** (`{ * 100 }`) — if these are removed from the grammar, existing files using them need updating. Alternatively, keep them parseable but classify as NL.
2. **JSON output** — `classification: "structural"` and `classification: "mixed"` no longer appear. Consumers keying on these values need updating.

### Recommended approach

1. Grammar change: keep `pipe_text` permissive (it already is). Remove or simplify function-call and arithmetic sub-rules.
2. Classification change: update `classify.ts` to return `nl` for all non-empty transforms.
3. Update all tests and examples.
4. Update spec and docs.

---

## Acceptance Criteria

1. `classify.ts` returns only `none`, `nl`, or `nl-derived`. No `structural` or `mixed`.
2. `satsuma arrows --json` never emits `classification: "structural"` or `classification: "mixed"`.
3. `satsuma nl mapping_name` returns ALL pipe step content, including bare tokens like `trim`.
4. `satsuma fmt` handles the simplified pipe steps correctly.
5. All existing `.stm` files parse without error (backward compatible).
6. The field-lineage webview no longer offers a classification filter.
7. Spec section 7.2 reframed as "vocabulary conventions" rather than "pipeline tokens."
8. All tests updated and passing.

---

## Related

- **ADR-023** — Pipeline Simplification: All Pipe Steps Are NL (to be issued with this feature)
- **sl-xy4s, sl-lzcp** — Deferred classification bugs that become moot after this change
- **Feature 27** — Exploratory bug fixes (Wave 1A removed because of this feature)
