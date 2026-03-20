---
id: sc-45sz
status: closed
deps: []
links: []
created: 2026-03-20T16:53:38Z
type: bug
priority: 2
assignee: Thorben Louw
tags: [cli, validate]
---
# NL-ref validation emits false-positive unresolved warnings for fields from fragment spreads

## Problem

`satsuma validate` emits spurious `nl-ref-unresolved` warnings when a backtick NL reference in a mapping transform expression points to a field that exists in the target schema only via a fragment spread.

For example, given:

```stm
namespace example {
  fragment common_measures {
    SALES_VALUE  DECIMAL(15,4) (required)
    RETURN_VALUE DECIMAL(15,4) (required)
  }

  schema product_day {
    DAY_DATE DATE (pk)
    ...common_measures
  }

  schema summary_day {
    DAY_DATE DATE (pk)
    TOTAL_SALES DECIMAL(15,4) (required)
    TOTAL_RETURNS DECIMAL(15,4) (required)
  }

  mapping 'Product to Summary' {
    source { `product_day` }
    target { `summary_day` }

    -> TOTAL_SALES { "SUM(`example::product_day.SALES_VALUE`)" }
    -> TOTAL_RETURNS { "SUM(`example::product_day.RETURN_VALUE`)" }
  }
}
```

`satsuma validate` reports:

```
warning [nl-ref-unresolved] NL reference `example::product_day.SALES_VALUE` in mapping 'example::Product to Summary' does not resolve to any known identifier
warning [nl-ref-unresolved] NL reference `example::product_day.RETURN_VALUE` in mapping 'example::Product to Summary' does not resolve to any known identifier
```

Both fields exist in `product_day` via the `...common_measures` spread — these are false positives.

## Root Cause

`resolveRef()` in `nl-ref-extract.js` (lines 70–79) resolves `namespace-qualified-field` refs by calling `hasField(schema.fields, fieldName)`. `hasField` iterates over the raw field list from the index, which contains spread reference nodes (e.g. `...common_measures`) rather than the expanded fragment fields. So any field contributed by a fragment spread is invisible to NL-ref resolution.

By contrast, the arrow-field validation in `validate.js` (lines 303–309) already calls `expandSpreads()` from `spread-expand.js` before checking field membership — so it does not have this problem.

The same issue affects the `dotted-field` (lines 82–98) and bare-identifier (lines 101–108) classification branches, which also call `hasField` without spread expansion.

## Fix

`resolveRef` needs to see expanded fields. Two options:

**Option A (index-time):** Have the index builder pre-expand fragment fields into each schema's field list (or a parallel `expandedFields` set). Then `hasField` works as-is.

**Option B (resolve-time):** In the field-checking branches of `resolveRef`, call `expandEntityFields()` (already exported from `spread-expand.js`) to get the full field set when the initial `hasField` check fails and the schema has spreads.

Option B is simpler and consistent with existing patterns. `expandEntityFields` already handles transitive spreads, cycles, and diamonds.

## Acceptance Criteria

1. `satsuma validate` on a workspace where a mapping NL-ref (any classification: `ns::schema.field`, `schema.field`, or bare `field`) targets a field that exists only via a fragment spread produces **no** `nl-ref-unresolved` warning for that ref.
2. `satsuma validate` still warns for NL-refs that genuinely don't resolve (field not in schema or any of its spreads).
3. Transitive spreads work: if fragment A spreads fragment B, and a schema spreads fragment A, a ref to a field from B resolves.
4. Existing `nl-ref-extract.test.js` and `nl-ref-validate.test.js` tests continue to pass.
5. New test cases cover at least: (a) namespace-qualified-field via spread, (b) dotted-field via spread, (c) bare identifier via spread, (d) transitive spread, (e) genuine miss still warns.

