# ADR-013 — NL @ref Mentions as Implicit Field Lineage

**Status:** Accepted
**Date:** 2026-03 (retrospective, PR #129)

## Context

Satsuma mappings declare explicit field lineage through arrows (`source_field -> target_field`). However, mappings also contain natural-language (NL) transform descriptions where `@ref` mentions reference fields or schemas textually — for example:

```satsuma
mapping ETL {
  source { raw_orders }
  target { clean_orders }

  raw_orders.amount -> clean_orders.amount {
    "@raw_orders.currency is used to convert to EUR"
  }
}
```

The question was whether these `@ref` mentions are purely documentary (human-readable notes) or whether they carry semantic weight in lineage analysis. If `@raw_orders.currency` appears in a transform string, should `satsuma lineage` and `satsuma graph` treat it as an upstream dependency of `clean_orders.amount`?

## Decision

An NL `@ref` mention in a mapping transform string carries the same lineage weight as a declared source field to the left of an arrow. When `@schema.field` appears in a transform block, it is semantically equivalent to adding that field as an additional source with `classification: nl-derived`.

All lineage-aware tools (`satsuma arrows`, `satsuma graph`, `satsuma lineage`, `satsuma field-lineage`, and the VS Code field-lineage panel) must follow `@ref` mentions as implicit field references. The classification `nl-derived` distinguishes them from explicit arrow declarations in output, but they are not second-class — they participate fully in depth traversal, direction filtering, and reachability analysis.

## Consequences

**Positive:**
- Lineage analysis captures the full picture of data dependencies, including those documented only in NL descriptions
- Business analysts who write `@ref` annotations get lineage tracing for free, without learning arrow syntax
- The `nl-derived` classification lets consumers distinguish implicit from explicit lineage when needed

**Negative:**
- False positives: an `@ref` mention used purely as documentation (not a real dependency) will appear as lineage — there is no opt-out mechanism
- Implementation complexity: every lineage-aware tool must resolve `@ref` mentions against the workspace index, not just iterate declared arrows
- The `graph-builder` and `arrows` modules must synthesize edges that don't exist in the CST — a departure from the principle that extraction follows the parse tree
