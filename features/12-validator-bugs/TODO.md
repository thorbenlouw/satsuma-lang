# TODO: Validator Bugs — False Positives from `stm validate`

> **Status: COMPLETED** (2026-03-18). All 5 bugs fixed. `stm validate examples/` clean. Remaining false positives against Feature 06 data-modelling examples are tracked in Feature 13.

## Bug 1: Resolve nested record/list field paths in field-not-in-schema check

- [ ] Extend `extractDirectFields()` (or add `extractFieldTree()`) in `src/extract.js` to build a nested field structure that includes fields inside `record` and `list` children, preserving the dotted path (e.g., `Order.Customer.CustomerId`)
- [ ] Update `collectSemanticWarnings()` in `src/validate.js` to resolve dotted arrow paths against the nested field tree instead of flat top-level names
- [ ] Handle bracketed array notation in paths (e.g., `CartLines[].unit_price` should match `CartLines` list containing `unit_price`)
- [ ] Handle relative paths (`.REFNUM`, `.ITEMNO`) — either skip validation for relative paths inside nested arrow blocks or resolve them against the parent context
- [ ] Add test: arrow `Order.OrderId` against schema with `record Order { OrderId STRING }` produces no warning
- [ ] Add test: arrow `CartLines[].unit_price` against schema with `list CartLines { unit_price DECIMAL }` produces no warning
- [ ] Add test: arrow `NonExistent.field` against schema without that record still produces a warning
- [ ] Verify `stm validate examples/xml-to-parquet.stm` produces 0 false positives
- [ ] Verify `stm validate examples/edi-to-json.stm` produces 0 false positives
- [ ] Verify `stm validate examples/protobuf-to-parquet.stm` produces 0 false positives

## Bug 2: Handle schema-qualified references in multi-source mappings

- [ ] Detect schema-qualified arrow paths (`schema_name.field_name`) where the first path segment matches a declared source schema name
- [ ] When a schema qualifier is detected, resolve the field against that specific schema rather than defaulting to `mapping.sources[0]`
- [ ] Add test: multi-source mapping with `crm_customers.email -> email` where `crm_customers` is a declared source produces no warning
- [ ] Add test: arrow with unknown schema qualifier still produces a warning
- [ ] Verify `stm validate examples/multi-source-join.stm` field-reference warnings are eliminated

## Bug 3: Fix metric source extraction

- [ ] Fix `extractMetrics()` in `src/extract.js` to correctly extract the value identifier from `source <identifier>` key-value pairs (currently returns the keyword `source` instead of the identifier)
- [ ] Handle the block form `source {id1, id2}` by enumerating individual identifiers within the braced block
- [ ] Add test: metric with `source fact_subscriptions` extracts `["fact_subscriptions"]`
- [ ] Add test: metric with `source {fact_subscriptions, dim_customer}` extracts `["fact_subscriptions", "dim_customer"]`
- [ ] Verify `stm validate examples/metrics.stm` `undefined-ref` warnings reflect actual source names, not `'source'`

## Bug 4: Suppress field-not-in-schema for unresolved spreads

- [ ] Detect schemas that contain fragment/template spreads (`...name`) in their body
- [ ] When a schema has unresolved spreads (import not followed), skip or soften the `field-not-in-schema` check for targets that could plausibly come from the spread, OR suppress the check entirely for schemas with unresolved spreads and emit an `info`-level `unresolved-spread` diagnostic instead
- [ ] Add test: schema with `...audit fields` spread does not produce false `field-not-in-schema` for `created_at`/`updated_at`
- [ ] Verify `stm validate examples/multi-source-join.stm` `created_at`/`updated_at` warnings are eliminated

## Bug 5: Eliminate duplicate warnings

- [ ] Investigate why the same arrow produces two identical warnings at the same file:line (likely `fieldArrows` stores each arrow twice — once per field key — and the validation loop visits both entries)
- [ ] Deduplicate diagnostics: either fix the iteration to avoid double-visiting, or deduplicate the final diagnostic list by `file + line + rule + message`
- [ ] Add test: a single arrow produces exactly one warning, not two
- [ ] Verify total warning count is halved after dedup fix (current: 121, expected after dedup alone: ~60)

## Final Verification

- [ ] Run `stm validate examples/` and confirm 0 errors, 0 false-positive warnings
- [ ] Run existing test suite and confirm no regressions
- [ ] Confirm true-positive warnings (genuinely undefined references, duplicate names) are still detected
