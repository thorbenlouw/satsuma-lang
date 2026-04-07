---
id: sl-wzpe
status: closed
deps: []
links: []
created: 2026-04-02T15:15:42Z
type: bug
priority: 3
assignee: Thorben Louw
tags: [examples, metrics]
---
# Canonical example metrics-platform/metrics.stm has 62 warnings

The canonical example examples/metrics-platform/metrics.stm produces 62 warnings when validated. The example corpus is supposed to be the golden reference for valid Satsuma patterns.

Two categories of issues:

1. Field name case mismatch: arrow source fields use PascalCase (Amount, CustomerSegment, Region, StartDate, etc.) but the source schemas in metric_sources.stm declare snake_case (amount, product_line, region, started_at). The mapping arrows reference fields that don't exist in the declared source schemas.

2. Renamed/missing fields: some arrow sources reference fields with entirely different names (e.g. total_revenue vs total_amount in fact_orders, isCancelled vs no such field in fact_subscriptions, order_count/avg_order_value not in fact_orders).

3. Unresolved NL refs: @is_trial, @isCancelled, @currency_rates reference identifiers that don't exist.

Fix approach: update metric_sources.stm field declarations to match the PascalCase names used in the mapping arrows (since the source schemas represent external system field names), and add any missing fields. Alternatively, update the arrows to use the declared snake_case names.

## Acceptance Criteria

- satsuma validate examples/metrics-platform/metrics.stm reports 0 errors and 0 warnings
- All field names in mapping arrows exist in their respective source/target schemas
- All @refs in NL strings resolve to known identifiers
- The example remains realistic and illustrative of metric mapping patterns

