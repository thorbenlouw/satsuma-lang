# ADR-023 — Pipeline Simplification: All Pipe Steps Are NL

**Status:** Accepted
**Date:** 2026-03

## Context

Satsuma transform bodies use pipe chains to describe how source data becomes target data:

```satsuma
EMAIL_ADDR -> email { trim | lowercase | validate_email | null_if_invalid }
PHONE_NBR -> phone { "Parse as E.164. If unparseable, set null." }
Amount -> amount_usd { "Multiply by rate from currency_rates" | round(2) }
```

The CLI classifies each arrow's transform as `structural` (bare tokens like `trim`), `nl` (quoted strings), or `mixed` (both). This classification powers filtering in the field-lineage webview and appears in JSON output.

However, this distinction is artificial. Both forms are interpreted by an LLM or a human — the CLI never executes `trim` or `round(2)`. The spec itself says: *"The parser is an LLM. Structure exists to delineate intent and scope."* If the consumer is always an LLM, then `trim` and `"trim"` carry identical information.

The distinction also causes bugs. Function calls with string arguments (`uuid_v5("ns", id)`, `split("/")`) are misclassified as `mixed` because the parser sees a quoted string inside the pipe step. This has been reported multiple times (sl-xy4s, sl-lzcp) and the root cause is inherent to the structural/NL distinction — fixing it means adding more complexity to distinguish "function argument strings" from "NL description strings."

## Decision

### All pipe steps are implicit NL strings

Every token sequence between pipe delimiters (`|`) in a transform body is a natural language string. Quotes are optional — `trim` and `"trim"` are equivalent. The only non-NL constructs in a pipe chain are:

- **`...transform` spreads** — structural expansion of a named transform
- **`map { }` literals** — discrete value mappings

### The classification axis collapses

Arrow classifications reduce from five to three:

| Classification | Meaning |
|---|---|
| `none` | No transform body (`src -> tgt`) |
| `nl` | Has a transform body (all content is NL) |
| `nl-derived` | Synthetic arrow from `@ref` in NL text |

`structural` and `mixed` are removed.

### Vocabulary tokens remain as conventions

Tokens like `trim`, `lowercase`, `validate_email`, `null_if_invalid` remain valid and encouraged as concise NL shorthand. They are just no longer a separate category. The spec's "Pipeline Tokens" table (section 7.2) becomes a "Vocabulary Conventions" reference — suggestions for common operations, not a recognised subset of built-in functions.

### Arithmetic operators are removed

Bare arithmetic (`{ * 100 }`, `{ + 1 }`) is removed from the grammar. These should be expressed as NL: `{ "Multiply by 100" }`. This removes parser ambiguity around operators in pipe steps.

## Consequences

**Positive:**
- Simpler language: one kind of pipe step content, not three.
- Simpler tooling: `classify.ts` becomes trivial; no function-argument string detection needed.
- Eliminates an entire class of bugs (sl-xy4s, sl-lzcp and future variants).
- More consistent with the spec's design philosophy ("the parser is an LLM").
- Reduces code in grammar, classifier, extractor, formatter, and viz.
- Viz rendering simplification: the mapping detail component and edge layer no longer need separate code paths for "pipeline" vs "nl" vs "mixed" transforms. All transforms render as NL text. The `TransformInfo.kind` type in `satsuma-viz-model` collapses from `"pipeline" | "nl" | "mixed" | "map"` to `"nl" | "map"`. The `steps: string[]` field becomes redundant (all steps are NL text in the `text` field). The orange "pipeline" edge colour and the field-lineage classification filter CSS (`.cls-structural`) can be removed.

**Negative:**
- Breaking change to JSON output: consumers keying on `classification: "structural"` need updating.
- The field-lineage webview loses the classification filter dropdown and per-classification edge colouring. All arrows with transforms are NL.
- Existing examples with `{ trim | lowercase }` remain valid but may look odd without quotes. Style guidance needed: when to use bare tokens vs prose.

### Downstream impact

The classification change flows through the stack without duplication:

1. **`@satsuma/core` (`classify.ts`)** — single source of truth for classification. Returns only `none`, `nl`, `nl-derived`.
2. **CLI** — inherits from core. JSON output changes automatically.
3. **LSP (`viz-model.ts`)** — calls `classifyTransform()` from core, then maps to viz kinds via `coreClassificationToVizKind()`. This function simplifies: `"structural"` and `"mixed"` branches are removed.
4. **`satsuma-viz-model`** — `TransformInfo.kind` type narrows. `steps: string[]` removed or repurposed.
5. **`satsuma-viz` edge layer and mapping detail** — rendering branches for "pipeline" and "mixed" removed. All transforms render as NL. The orange pipeline edge colour is removed; all transform edges use the NL style.
6. **VS Code field-lineage webview** — classification filter dropdown removed. CSS classes `.cls-structural`, `.cls-mixed` removed. Arrowhead markers simplified to `none`, `nl`, `nl-derived`.
