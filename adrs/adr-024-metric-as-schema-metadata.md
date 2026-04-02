# ADR-024 — Replace metric Keyword with schema(metric) Metadata Decoration

**Status:** Accepted
**Date:** 2026-04

## Context

Satsuma v2 originally introduced `metric` as a first-class grammar keyword — a
distinct block type alongside `schema`, `mapping`, `fragment`, and `transform`:

```satsuma
metric monthly_recurring_revenue "MRR" (
  source fact_subscriptions,
  grain monthly,
  slice {customer_segment, product_line, region}
) {
  value  DECIMAL(14,2)  (measure additive)
}
```

This design placed `metric` in the reserved keyword list and required the grammar,
parser, extractor, formatter, LSP, CLI, and viz backend to handle metric blocks as
a separate code path.

However, Satsuma already has a well-established pattern for annotating schemas
with domain semantics: the `( )` metadata block on a `schema` declaration. The
`report` and `ml_model` patterns use this — a schema carries `(report)` or
`(model)` metadata to signal its domain role to tooling. There was no principled
reason to make `metric` a different kind of syntactic construct rather than another
member of the same family.

The `metric` keyword also introduced structural redundancy: the metric block had
its own embedded source list (specifying which schemas the metric derives from)
even though Satsuma's standard mechanism for expressing data flow is a `mapping`
block. Having two mechanisms for the same concern made lineage tracing harder and
the language less consistent.

## Decision

Remove `metric` as a reserved keyword and block type. Metrics are declared as
`schema` blocks decorated with the `metric` vocabulary token in the metadata block:

```satsuma
schema monthly_recurring_revenue (
  metric,
  metric_name "MRR",
  source fact_subscriptions,
  grain monthly,
  slice {customer_segment, product_line, region}
) {
  value  DECIMAL(14,2)  (measure additive)
}

mapping _mrr_pipeline {
  source { fact_subscriptions }
  target { monthly_recurring_revenue }

  Amount -> value { to_decimal(14,2) | "Normalize to monthly" }
}
```

The human-readable display label previously carried as a positional quoted string
after the metric name (`metric monthly_recurring_revenue "MRR" (...)`) becomes an
explicit `metric_name` tag with a value (`metric_name "MRR"`). This makes the
label's role explicit and consistent with how other named values are expressed in
metadata blocks.

The `satsuma metric <name>` CLI command continues to exist — it now queries schemas
decorated with the `metric` metadata token rather than a distinct block type.
Tooling identifies metric schemas by inspecting the metadata block for the `metric`
tag (via `isMetricSchema()` in `satsuma-core`), not by checking the CST node type.

## Consequences

**Positive:**

- One fewer reserved keyword: `metric` is now a vocabulary token, not a keyword.
  This reduces the grammar's keyword footprint and follows the Satsuma principle
  that new domain concepts should be expressible as metadata, not new syntax.
- Consistent pattern: metrics, reports, and ML models all use the same schema +
  metadata decoration pattern. Tooling that handles one handles all.
- Data flow expressed once: the `mapping` block is the canonical mechanism for
  expressing how data flows into a metric. No duplicate source specification.
- Simpler grammar: `metric_block` is removed; the grammar's `schema_block` rule
  already handles everything.
- Simpler tooling: extractors, formatters, validators, and LSP features no longer
  need separate code paths for metric blocks.

**Negative:**

- Breaking change to existing `.stm` files that use the `metric` keyword syntax.
  All examples, fixtures, and corpus tests must be updated.
- Breaking change to JSON output: consumers that matched on `"type": "metric"` in
  graph or summary output need to adapt to `"type": "schema"` with
  `"isMetric": true`.
- The positional display label syntax (`metric name "Label" (...)`) is removed.
  Files using it must be migrated to `metric_name "Label"` inside the metadata block.

### Downstream impact

Changes flow through the full stack:

1. **`tree-sitter-satsuma`** — `metric_block` rule removed from grammar. Corpus
   tests updated to use `schema_block` with `metric` metadata.
2. **`@satsuma/core`** — `isMetricSchema()` utility added; extraction, formatting,
   and validation updated to use schema metadata inspection instead of node type.
3. **`satsuma-cli`** — `metric` command queries metric schemas; JSON output updated.
4. **`satsuma-lsp`** — hover, symbols, codelens, folding updated to detect metric
   schemas via metadata rather than node type.
5. **`satsuma-viz-backend`** — viz model extraction updated; metric nodes continue
   to appear in graphs but are represented as schemas with `isMetric: true`.
6. **Spec and docs** — Section 6 of `SATSUMA-V2-SPEC.md` updated; `metric` removed
   from reserved keywords list.
