# Feature 13 — Data Modelling CLI Bugs

> **Status: OPEN** — 15 parse errors + 65 false-positive warnings remain against Feature 06 examples. Ready to implement.

## Goal

Fix the parser and CLI issues discovered when running `satsuma` commands against the Feature 06 data-modelling examples (`example_kimball/` and `example_datavault/`). Currently these files produce **15 parse errors and 65 false-positive warnings** across both example sets, plus several CLI output bugs.

---

## Problem

The Feature 06 examples are canonical, production-grade Satsuma files demonstrating Kimball and Data Vault conventions. They exercise syntax patterns that are valid per the Satsuma v2 spec and the Feature 06 PRD, but the parser and CLI tools fail on them. This blocks any downstream use of these examples for testing, demos, or LLM-driven tooling.

The issues cluster into **3 parser bugs**, **3 validator bugs**, and **2 CLI output bugs**.

---

## Parser Bugs

### Bug 1: Triple-quoted strings cannot contain double-quote characters

**9 parse errors** across `link-inventory.stm`, `link-sale.stm`, `mart-sales.stm` (datavault); `fact-sales.stm`, `fact-inventory.stm` (kimball).

The `multiline_string` grammar rule is defined as:

```js
multiline_string: (_) => token(prec(1, /"""[^"]*"""/)),
```

The regex `[^"]*` rejects any `"` inside the triple-quoted string. But real-world notes frequently contain double quotes (e.g., `"as-of" queries`, `"WEB-{id}"`). The spec and Feature 06 PRD both use triple-quoted strings with embedded quotes.

**Affected files:**
- `example_datavault/link-inventory.stm:14` — `"as-of"` and `"Which...?"` inside note
- `example_datavault/link-inventory.stm:47` — triple-quoted note with embedded prose
- `example_datavault/link-sale.stm:67` — triple-quoted note with embedded prose
- `example_datavault/mart-sales.stm:42-45` — cascading errors from upstream parse failure
- `example_kimball/fact-sales.stm:73-76` — cascading errors from `ref ... on` (see Bug 2)
- `example_kimball/fact-inventory.stm:47-48` — cascading errors from `ref ... on`

**Fix:** Change the regex to allow 0-2 consecutive `"` inside the triple-quoted body. A correct pattern: `/"""([^"]|"[^"]|""[^"])*"""/` or use an external scanner.

### Bug 2: `ref <schema> on <field>` metadata syntax not supported

**6 parse errors** across `mart-sales.stm` (datavault); `fact-sales.stm`, `fact-inventory.stm` (kimball).

The Feature 06 PRD defines `ref <dim> on <field>` as a standard Kimball convention for dimension references on fact tables (see PRD section "Kimball-Specific Conventions"). The grammar's `_metadata_entry` rule supports `key_value_pair` (key + single value), but not `key value value` or `key value "on" value` compound forms.

Example failing syntax:
```stm
schema fact_sales (
  fact,
  grain {transaction_id, line_number},
  ref dim_customer on customer_id,    // Parse error: "on customer_id" unexpected
  ref dim_product on sku,
  ref dim_store on store_id,
  ref dim_date on transaction_date,
  note "Transaction line-item fact"
) { ... }
```

The `ref dim_customer` parses as a key-value pair, but `on customer_id` has no matching grammar rule.

**Fix:** Extend `_kv_value` or add a `ref_entry` rule that accepts `identifier identifier "on" identifier` as a compound metadata value. Alternatively, make `kv_compound` handle the `on` keyword as a continuation.

### Bug 3: `note` blocks with triple-quoted strings at file/workspace level

Some file-level `note { """ ... """ }` blocks with embedded double quotes cause parse errors that cascade into misidentified schema boundaries. This is a combination of Bug 1 (triple-quote regex) manifesting in `note_block` context.

---

## Validator Bugs

### Bug 4: Duplicate schema definitions across files cause false field-not-in-schema warnings

**~28 false-positive warnings** in workspace validation mode.

When a source schema (e.g., `pos_oracle`) is declared in multiple files with different field subsets (dim-store.stm has store fields, fact-sales.stm has transaction fields, dim-customer.stm has customer fields), workspace validation picks one declaration and validates all arrows against that single field set. Fields from other declarations are flagged as missing.

**Reproduction:**
```bash
satsuma validate features/06-data-modelling-with-stm/example_kimball/dim-store.stm
# → no issues

satsuma validate features/06-data-modelling-with-stm/example_kimball/
# → 13 warnings: "Arrow source 'STORE_NAME' not declared in schema 'pos_oracle'" etc.
```

The `pos_oracle` in `dim-store.stm` has `STORE_NAME`, `ADDR_LINE_1`, etc. The `pos_oracle` in `fact-sales.stm` has `TRANS_ID`, `SKU`, etc. Workspace validation resolves `pos_oracle` to one definition and rejects fields from the other.

**Root cause:** The validator's schema index keeps only one definition per name. It should either merge field sets from duplicate declarations or validate arrows against the schema declaration from the same file.

**Affected schemas:** `pos_oracle` (3 files), `ecom_shopify` (2 files), `wms_manhattan` (2 files), `loyalty_sfdc` (2 files) — all source schemas redeclared with different field subsets.

### Bug 5: Inferred/convention fields flagged as missing

**~25 false-positive warnings** across datavault examples.

Data Vault convention fields like `record_source`, `hub_customer_hk`, `load_date` are **inferred by metadata tokens** (per Feature 06 PRD) and intentionally not declared in the schema body. When arrows target these inferred fields (e.g., `-> record_source { "POS" }`), the validator flags them as `field-not-in-schema`.

Examples:
- `-> record_source { "SFDC" }` in every hub/link/satellite mapping
- `hub_customer.customer_id -> customer_id` where `customer_id` is a field but `hub_customer_hk` is inferred
- `link_sale_hk -> link_sale_hk` where `link_sale_hk` is inferred from the `link` token

**Fix:** Either suppress `field-not-in-schema` for fields that match a known inference pattern (based on schema metadata tokens like `hub`, `link`, `satellite`), or mark them as a softer diagnostic level. This may be deferred to a future semantic-aware validator.

### Bug 6: Single-file validation does not follow `import ... from` paths

**5 false-positive warnings** when validating `mart-sales.stm` alone.

```bash
satsuma validate example_datavault/mart-sales.stm
# → 5 undefined-ref warnings for link_sale, sat_sale_detail, hub_customer, etc.
```

The file has `import { link_sale, sat_sale_detail } from "link-sale.stm"` at the top, but single-file validation doesn't follow import paths to resolve cross-file references. Workspace validation resolves these correctly.

**Fix:** In single-file mode, either follow relative import paths to discover referenced schemas, or suppress `undefined-ref` for names that appear in import statements.

---

## CLI Output Bugs

### Bug 7: `find --tag` does not match schema-level metadata tags

**0 results** for schema-level tags like `dimension`, `fact`, `hub`, `link`, `satellite`.

```bash
satsuma find --tag dimension features/06-data-modelling-with-stm/example_kimball/
# → No matches found.

satsuma find --tag hub features/06-data-modelling-with-stm/example_datavault/
# → No matches found.
```

But `satsuma meta dim_customer` shows `[tag] dimension` and `satsuma meta hub_customer` shows `[tag] hub`. The `find --tag` command only searches field-level metadata tags, not schema-level tags.

**Fix:** Extend `find --tag` to also search schema-level metadata entries from `metadata_block`.

### Bug 8: `meta` command truncates `ref ... on` compound metadata

```bash
satsuma meta fact_sales features/06-data-modelling-with-stm/example_kimball/
# Output includes: ref: dim_date on
# Should be: ref: dim_date on transaction_date
```

The `on <field>` part is lost because the grammar doesn't parse it (see Bug 2). Once Bug 2 is fixed, this output bug should resolve automatically.

---

## Impact Summary

| Bug | Type | Count | Severity |
|-----|------|-------|----------|
| 1. Triple-quote with embedded `"` | Parser | 9 errors | **High** — blocks parsing of 5 files |
| 2. `ref ... on` compound metadata | Parser | 6 errors | **High** — blocks parsing of 3 files |
| 3. Note block triple-quote cascade | Parser | (included in 1) | Medium |
| 4. Duplicate schema field merging | Validator | ~28 warnings | **Medium** — false positives in workspace mode |
| 5. Inferred convention fields | Validator | ~25 warnings | **Medium** — expected for convention-based modelling |
| 6. Import path resolution | Validator | 5 warnings | Low — workaround: validate directory |
| 7. `find --tag` schema-level tags | CLI output | functional gap | **Medium** — core discovery feature incomplete |
| 8. `meta` ref truncation | CLI output | cosmetic | Low — depends on Bug 2 fix |

---

## Success Criteria

1. `satsuma validate features/06-data-modelling-with-stm/example_datavault/` produces 0 errors and 0 false-positive warnings.
2. `satsuma validate features/06-data-modelling-with-stm/example_kimball/` produces 0 errors and 0 false-positive warnings.
3. Triple-quoted strings with embedded `"` characters parse correctly.
4. `ref <schema> on <field>` metadata syntax parses correctly and is fully represented in `meta` output.
5. `find --tag dimension` (and `hub`, `link`, `satellite`, `fact`) returns matching schemas.
6. Workspace validation merges or correctly scopes duplicate schema definitions from different files.
7. Existing `examples/` validation (Feature 12 scope) is not regressed.

---

## Non-Goals

- Semantic validation of metadata token combinations (e.g., `hub` + `dimension` conflict) — future linting work.
- Inference-aware validation that auto-generates convention fields — future tooling.
- Performance optimization.

---

## Files Likely Affected

- `tooling/tree-sitter-satsuma/grammar.js` — multiline_string regex (Bug 1), ref-on compound (Bug 2)
- `tooling/tree-sitter-satsuma/test/corpus/` — new corpus tests for fixed syntax
- `tooling/satsuma-cli/src/validate.js` — duplicate schema handling (Bug 4), import resolution (Bug 6)
- `tooling/satsuma-cli/src/extract.js` — field merging for duplicate schemas
- `tooling/satsuma-cli/src/meta-extract.js` — schema-level tag extraction for `find --tag` (Bug 7)
- `tooling/satsuma-cli/src/commands/find.js` — schema-level tag search (Bug 7)

---

## Priority

Bugs 1 and 2 (parser) should be fixed first as they block parsing and cascade into all downstream tools. Bug 4 (duplicate schema merging) is next as it produces the most false positives. Bug 7 (find --tag) is a functional gap in a core discovery command. Bugs 5, 6, and 8 are lower priority.
