# Feature 12 — Validator Bugs: False Positives from `stm validate`

> **Status: COMPLETED** (2026-03-18). `stm validate examples/` produces 0 errors and 0 warnings. All 5 bugs fixed.

## Goal

Fix the false-positive warnings emitted by `stm validate` so that the canonical `examples/` corpus produces zero warnings when all referenced fields and sources are correctly declared.

Currently `stm validate examples/` reports 121 warnings across 5 files. Every single warning is a false positive caused by validator limitations in nested field resolution, schema-qualified references, metric source extraction, import spread resolution, and duplicate emission.

---

## Problem

`stm validate` is the structural correctness check for STM workspaces. If it emits false positives on the canonical examples, users and agents cannot trust its output. The noise buries real issues and trains users to ignore warnings.

The 121 false positives cluster into five distinct bugs:

### Bug 1: Nested record/list field paths not resolved (`field-not-in-schema`)

**~90 warnings across edi-to-json.stm, xml-to-parquet.stm, protobuf-to-parquet.stm**

The `field-not-in-schema` check in `src/validate.js` (lines 116-117) compares arrow source/target paths against a flat set of top-level field names from the schema. It does not walk into `record` or `list` children.

Examples of valid paths that produce false warnings:
- `BeginningOfMessage.DOCNUM` — `DOCNUM` is inside `record BeginningOfMessage` in `edi_desadv`
- `Order.Customer.CustomerId` — `CustomerId` is inside `record Customer` inside `record Order` in `commerce_order`
- `CartLines[].unit_price` — `unit_price` is inside `list CartLines` in `commerce_event_pb`
- `.REFNUM`, `.ITEMNO` — relative paths inside nested arrow blocks

**Root cause:** `extractDirectFields()` in `src/extract.js` only collects fields at the immediate body level. The validator builds `srcNames`/`tgtNames` from this flat list.

### Bug 2: Schema-qualified references in multi-source mappings (`field-not-in-schema`)

**~20 warnings in multi-source-join.stm**

When a mapping has multiple sources, arrows use `schema_name.field_name` syntax (e.g., `crm_customers.customer_id`). The validator treats the entire dotted path as a field lookup within the first source schema, rather than recognizing the first segment as a schema qualifier.

Example: `crm_customers.customer_id -> customer_id` — the validator looks for `crm_customers.customer_id` as a field name in the first source schema, instead of looking for `customer_id` in `crm_customers`.

**Root cause:** `src/validate.js` (line 112) always uses `mapping.sources[0]` as the source schema and compares the full `arrow.source` path against its field set.

### Bug 3: Metric source extraction returns keyword instead of value (`undefined-ref`)

**7 warnings in metrics.stm**

The warning message says `Metric 'monthly_recurring_revenue' references undefined source 'source'` — the extracted source name is literally the keyword `source`, not the actual source `fact_subscriptions`.

For the multi-value form `source {fact_subscriptions, dim_customer}`, the extraction also fails to enumerate the individual identifiers within the braced block.

**Root cause:** `extractMetrics()` in `src/extract.js` (lines 138-153) does not correctly extract the value from `source` key-value pairs in metric metadata. The block form `source { ... }` is also not handled.

### Bug 4: Import spreads not resolved (`field-not-in-schema`)

**2 warnings in multi-source-join.stm**

`customer_360` schema includes `...audit fields` (spread from imported `lib/common.stm`), which contributes `created_at` and `updated_at`. The validator does not resolve imports or expand spreads, so these fields are missing from the schema's field set.

**Root cause:** Neither `extract.js` field extraction nor `validate.js` field resolution follows imports or expands template spreads.

### Bug 5: Duplicate warnings emitted

**~60 extra warnings (roughly doubles the count)**

Most `field-not-in-schema` warnings appear twice for the same arrow at the same line. This suggests the field arrows index or the validation loop iterates over the same arrow record twice.

**Root cause:** Likely in the `fieldArrows` iteration in `src/validate.js` (lines 119-153), which loops over all `fieldArrows` entries for every mapping without deduplication, or the index itself stores each arrow twice (once keyed by source field, once by target field).

---

## Success Criteria

1. `stm validate examples/` produces 0 errors and 0 false-positive warnings.
2. Arrows with nested `record`/`list` paths (e.g., `Order.Customer.Email`) are validated against the nested field tree, not just top-level names.
3. Schema-qualified arrow paths in multi-source mappings (e.g., `crm_customers.email`) resolve the schema qualifier before field lookup.
4. Metric `source` extraction returns actual source identifiers, both for single-value (`source fact_subscriptions`) and block form (`source {a, b}`).
5. Spread fields from imports are either resolved or excluded from field-not-in-schema checks (with a separate `unresolved-spread` info diagnostic if desired).
6. No duplicate warnings are emitted for the same arrow at the same location.
7. Existing true-positive detection (undefined schema refs, duplicate names, parse errors) is not regressed.

---

## Non-Goals

- Cross-file import resolution for full workspace validation (Bug 4 fix can suppress rather than resolve).
- New validation rules beyond fixing existing false positives.
- Performance optimization of the validator.

---

## Files Affected

- `tooling/stm-cli/src/validate.js` — field-not-in-schema check, dedup logic
- `tooling/stm-cli/src/extract.js` — `extractDirectFields()`, `extractMetrics()`, field tree model
- `tooling/stm-cli/test/` — new test cases for each bug fix
