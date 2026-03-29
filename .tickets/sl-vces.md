---
id: sl-vces
status: open
deps: []
links: []
created: 2026-03-29T16:14:45Z
type: feature
priority: 1
assignee: Thorben Louw
tags: [grammar, metrics, lineage, viz, lsp]
---
# feat(metrics): sources{} structural block + full lineage participation

## Problem

Metrics currently declare their source schemas as a metadata vocabulary token inside the `( )` block:

```satsuma
metric monthly_recurring_revenue "MRR" (
  source fact_subscriptions,
  grain monthly,
  slice {segment, region},
  filter "status = 'active'"
) {
  value DECIMAL(14,2) (measure additive)
}
```

This has several weaknesses:

1. **Looks and parses like metadata, not structure.** `source` is a vocabulary token alongside `grain` and `filter`. Tooling must special-case it. It is invisible to navigation features (no go-to-definition, find-references, or completions for schema names inside `( )`).
2. **No structural parity with mappings.** Mappings have a first-class `source { }` block with full parser support, namespace resolution, per-source metadata, and NL join descriptions. Metrics have none of this.
3. **Field-level lineage is a dead end at the metric.** Because there are no declared arrows or structural source links, `satsuma field-lineage schema.field` traces through mappings fine but stops before reaching the metric that ultimately consumes the field. Metrics appear as isolated sink nodes rather than as connected terminal consumers.
4. **Where-used misses metrics.** `satsuma where-used fact_orders` finds schemas in mapping `source {}` blocks but not in metric metadata tags.
5. **Consumer schemas (`report`, `model`) cannot declare metrics as lineage sources.** A downstream report or ML model that is derived from a metric has no way to express that structural dependency today.

## Proposed Syntax

Introduce a first-class `sources { }` block inside the metric body — syntactically parallel to the `source { }` block in mappings:

```satsuma
metric monthly_recurring_revenue "MRR" (grain monthly, slice {segment, region}) {
  sources {
    fact_subscriptions (filter "status = 'active'")
  }

  value DECIMAL(14,2) (measure additive)

  note {
    """
    Sum of active subscription amounts, normalized to monthly.
    Annual subscriptions divided by 12. Quarterly by 3.
    """
  }
}

metric customer_lifetime_value "CLV" (slice {acquisition_channel, segment, cohort_year}) {
  sources {
    fact_orders
    dim_customer
    "Join @fact_orders to @dim_customer on @customer_id"
  }

  value            DECIMAL(14,2)  (measure non_additive)
  order_count      INTEGER        (measure additive)
  avg_order_value  DECIMAL(12,2)  (measure non_additive)
}
```

Structural rules:
- `sources { }` is a named block inside `metric_body`, not a metadata token.
- Contents mirror `source { }` in mappings: schema references (bare or `ns::name`), optional per-source metadata `(filter "...")`, and optional NL join description strings with `@ref`s.
- `source` is removed from the `( )` metric metadata block. `grain`, `slice`, and `filter` remain there (they are not structural relationships).
- A `filter` without an associated schema (global pre-filter) stays in the `( )` metadata block.
- Per-source filter conditions move inside the `sources { }` block next to the schema they apply to.

### Backward compatibility

Old syntax (`source fact_orders,` inside `( )`) should emit a parse warning during a migration window and still be extracted — but new files should use `sources { }`. Once all examples and fixtures are migrated, the old token can be removed from the grammar.

### Consumer schemas referencing metrics as sources

`report`-indicated and `model`-indicated schemas can already declare `source { }` in their metadata block. The index-builder should now resolve those sources against the metrics index as well as the schemas index, creating lineage edges `metric → consumer_schema`:

```satsuma
schema quarterly_dashboard (report, tool looker) {
  sources {
    monthly_recurring_revenue
    customer_lifetime_value
    churn_rate
  }

  mrr_value    DECIMAL(14,2)
  clv_value    DECIMAL(14,2)
  churn_pct    DECIMAL(5,4)
}
```

This makes consumer schemas proper nodes in the lineage graph — data flows: `fact_schema → mapping → intermediate_schema → metric → consumer_schema`.

**Note:** The `sources {}` block on consumer schemas (`report`/`model`) is the same syntax as on metrics. The `source` metadata tag on `schema` blocks should similarly be promoted to a first-class `sources { }` block for consistency (though that migration is in scope for a follow-on ticket if complex).

## Design

### 1. Tree-sitter grammar changes (`tooling/tree-sitter-satsuma/`)

Add a `metric_sources_block` rule to `grammar.js`:

```js
metric_sources_block: ($) =>
  seq("sources", "{", repeat($._metric_source_entry), "}"),

_metric_source_entry: ($) =>
  choice(
    seq($.source_ref, optional($.metadata_block)),  // reuse source_ref
    $.nl_string,                                     // NL join description
    $.multiline_string,
  ),
```

Add `metric_sources_block` to `_metric_body_item`:

```js
_metric_body_item: ($) =>
  choice($.field_decl, $.note_block, $.metric_sources_block),
```

Deprecate (but keep for migration) `source` as a `metric_meta` entry:
- Keep parsing `source ...` in `metric_meta` to avoid breaking existing files.
- Emit a `MISSING` hint node or a comment-style annotation so tooling can surface the deprecation.

Update all corpus fixtures in `test/corpus/` that use the old `source` metadata syntax.

### 2. CLI extraction (`tooling/satsuma-cli/src/`)

**`extract.ts` — `extractMetrics()`:**
- Add extraction from `metric_sources_block` CST nodes in `metric_body`.
- Keep the metadata fallback for backward compat during migration.
- Populate `sources[]` from `metric_sources_block` entries (schema refs and resolved qualified names).

**`index-builder.ts` — `buildReferenceGraph()`:**
- `metricsReferences` already maps `metricName → sourceSchemas[]`. No structural change needed once extraction is updated.
- Add handling for consumer schemas: for each schema with `(report)` or `(model)` metadata, parse its `sources { }` block (or `source` metadata tag) and add edges for any entries that resolve to a metric in the metrics index.
- New edge type: `consumerReferences: Map<string, string[]>` mapping `consumerSchemaName → [metricName, ...]`.

**`graph-builder.ts`:**
- Add `consumer` node kind or use the existing `schema` node with a `subkind` for `report`/`model`.
- Add edges for `consumerReferences` (metric → consumer schema direction).

**`validate.ts`:**
- Check that names declared in `sources { }` of a metric resolve to known schemas (error) or warn if unresolvable.
- Check that consumer schema `sources {}` entries resolve to known schemas or metrics.

**`lint-engine.ts`:**
- Update the metric context lookup (currently reads `metric.sources`) — no structural change once extraction provides the right data.

### 3. CLI commands

**`satsuma lineage`:**
- `--from fact_subscriptions` should now follow `fact_subscriptions → MRR → quarterly_dashboard` when consumer references are wired.
- `--from MRR` (starting from a metric) should show consumer schemas as downstream.

**`satsuma field-lineage`:**
- `satsuma field-lineage fact_subscriptions.amount` should trace to metrics that declare `fact_subscriptions` in their `sources {}` block, appearing as downstream terminal nodes.
- Add metric nodes as terminal downstream entries in the field-lineage response JSON.

**`satsuma where-used`:**
- Schema names in metric `sources {}` blocks should appear in `where-used` results (they currently appear only from mapping `source {}` blocks).

**`satsuma arrows`:**
- A schema field's downstream arrows currently stop at the mapping level. With metric sources, add "consumed by metric" entries to the `arrows --as-source` output when a mapping target schema is a metric source.

**`satsuma graph`:**
- Metrics already appear as terminal nodes; consumer schema nodes should appear as a new downstream tier.
- Edge labels: `schema → mapping → schema` (structural transform), `schema → metric` (metric source), `metric → consumer_schema` (report/model derivation).

### 4. LSP / VS Code extension (`tooling/vscode-satsuma/`)

**`workspace-index.ts`:**
- The `metric_source` context in `ReferenceEntry` is already wired (indexMetricRefs reads `source` tags). Update `indexMetricRefs` to read from `metric_sources_block` CST nodes instead.
- Go-to-definition from a schema name inside `sources { }` → the schema definition.
- Find-references of a schema should include its appearances in metric `sources {}` blocks.
- Completions inside `sources { }` of a metric → suggest schema names (same as mapping `source { }` completions).

**`server.ts` diagnostics:**
- The new `missing-import` semantic diagnostic should also fire when a schema name in a metric `sources {}` block refers to an unimported schema.

**`viz-model.ts`:**
- Metrics already appear in `MetricCard` in the viz. Update `buildVizModel` to:
  - Populate `MetricCard.sourceRefs` from the new `sources {}` block.
  - Add a `consumerSchemas` field to `MetricCard` listing any `report`/`model` schemas that declare this metric as a source.
- The viz panel should render the metric → consumer schema edges.

### 5. Spec and documentation

**`SATSUMA-V2-SPEC.md` §6:**
- Update §6.1 structure example to show `sources { }` block.
- Update §6.2 to remove `source` from metric metadata tokens table and add a note about migration.
- Add §6.3 `sources { }` block (mirrors §4.1 source_block for mappings).
- Update §6.5 "What Metrics Are Not" to clarify the new lineage participation model.

**`AI-AGENT-REFERENCE.md`:**
- Update the `metric` EBNF rule.
- Update the conventions section metric rules.
- Update the "common mistakes" table.

**`examples/metrics.stm`:**
- Migrate all metrics to the new `sources { }` syntax.

## Acceptance Criteria

- [ ] `metric_sources_block` added to tree-sitter grammar; corpus tests updated and passing
- [ ] Parser correctly parses `sources { }` with bare names, namespaced refs, per-source metadata, and NL strings
- [ ] Old `source` metadata tag still parses without error (backward compat) but tooling prefers `sources {}`
- [ ] `extractMetrics()` reads sources from `metric_sources_block` (with fallback to old metadata)
- [ ] `satsuma where-used fact_subscriptions` includes metrics that declare it in `sources {}`
- [ ] `satsuma field-lineage fact_subscriptions.amount` includes consuming metrics as downstream terminal nodes
- [ ] `satsuma lineage --from fact_subscriptions` traverses through metrics to consumer schemas
- [ ] `satsuma graph` includes metric → consumer schema edges
- [ ] LSP: go-to-definition from schema name inside metric `sources {}` works
- [ ] LSP: find-references of a schema includes its metric `sources {}` appearances
- [ ] LSP: completions inside metric `sources {}` suggest reachable schema names
- [ ] LSP: missing-import diagnostic fires for schemas in metric `sources {}` that are not imported
- [ ] `examples/metrics.stm` migrated to new syntax; all existing tests still pass
- [ ] `SATSUMA-V2-SPEC.md` and `AI-AGENT-REFERENCE.md` updated
- [ ] Consumer schema (`report`/`model`) `sources {}` entries that resolve to metrics create lineage edges in the graph
- [ ] Viz panel shows metric source schemas as incoming edges and consumer schemas as outgoing edges on MetricCard nodes
