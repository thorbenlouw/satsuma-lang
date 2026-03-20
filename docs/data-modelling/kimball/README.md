# RetailCo International — Kimball Star Schema

A complete Kimball dimensional model for a multinational department store, expressed in Satsuma v2 using free-form metadata conventions for dimensions, facts, and SCD patterns.

## How it works

Satsuma v2 uses `( )` metadata blocks for **all** annotations — there are no special `@tag` annotations or reserved modelling keywords. Tokens like `dimension`, `fact`, `scd`, `grain` are free-form vocabulary interpreted by an LLM, not by a deterministic parser. This means:

- The **grammar doesn't change** when you add new modelling patterns
- The **meaning of tokens is conventional**, not enforced — see [LLM-Guidelines.md](LLM-Guidelines.md) for how an LLM should interpret them
- **Tooling infers mechanical columns** (surrogate keys, validity dates, etc.) based on these conventions — they are never written in the Satsuma file

## Files

| File | Description | Key conventions demonstrated |
|------|-------------|------------------------------|
| `platform.stm` | Platform entry point — imports all pipeline schemas | Namespace-qualified imports, lineage traversal |
| `common.stm` | Shared fragments (address, audit), lookups (regions, hierarchy, channels) | `fragment`, `schema` for lookups, `import` |
| `dim-customer.stm` | Conformed customer dimension, SCD Type 2, fed by 3 sources | `dimension`, `conformed`, `scd 2`, `track`, `ignore`, multi-source mapping |
| `dim-product.stm` | Product dimension with merchandise hierarchy, SCD Type 1 | `dimension`, `scd 1`, `natural_key`, lookup-via-NL |
| `dim-store.stm` | Store dimension, SCD Type 2 | `dimension`, `scd 2`, fragment spread, lookup enrichment |
| `fact-sales.stm` | Transaction-grain fact, multi-source (POS + e-commerce) | `fact`, `grain`, `ref`, `measure additive`/`non_additive`, `degenerate` |
| `fact-inventory.stm` | Daily periodic snapshot fact | `fact`, `snapshot periodic`, `measure semi_additive` |
| **Information Mart Layer** | | |
| `mart-customer-360.stm` | Customer 360 enriched with transaction aggregates | Cross-layer `import` of dim + fact, RFM scoring, channel preference |

## Metadata Convention Quick Reference

These are **vocabulary tokens** in `( )` metadata — not reserved keywords. An LLM interprets their meaning. See [LLM-Guidelines.md](LLM-Guidelines.md) for the full interpretation rules.

### Schema-level tokens

| Token | Meaning | Example |
|-------|---------|---------|
| `dimension` | This is a dimension table | `schema dim_customer (dimension, scd 2) { ... }` |
| `conformed` | Shared across star schemas | `(dimension, conformed)` |
| `fact` | This is a fact table | `schema fact_sales (fact, grain {id, line}) { ... }` |
| `snapshot periodic` | Periodic snapshot fact | `(fact, snapshot periodic)` |
| `scd N` | SCD strategy (1, 2, or 6) | `(scd 2)` |
| `natural_key <field>` | Business key for the dimension | `(natural_key customer_id)` |
| `track {fields}` | Fields that trigger SCD versioning | `(track {email, phone})` |
| `ignore {fields}` | Fields that do NOT trigger versioning | `(ignore {last_login_channel})` |
| `grain {fields}` | Fact table grain | `(grain {transaction_id, line_number})` |
| `ref <dim>.<field>` | Foreign key to a dimension | `(ref dim_customer.customer_id)` |

### Field-level tokens

| Token | Meaning | Example |
|-------|---------|---------|
| `measure additive` | Summable across all dimensions | `quantity INTEGER (measure additive)` |
| `measure semi_additive` | Summable across some dimensions (not time) | `qty_on_hand INTEGER (measure semi_additive)` |
| `measure non_additive` | Cannot be summed | `unit_price DECIMAL (measure non_additive)` |
| `degenerate` | Dimension attribute stored on the fact | `channel VARCHAR(20) (degenerate)` |

## What Tooling Would Infer

The Satsuma files contain **only business fields**. The following mechanical columns are inferred by convention:

### For `dimension` + `scd 2` (dim_customer, dim_store)

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `surrogate_key` | `BIGINT (pk, auto)` | Auto-incrementing surrogate primary key |
| `valid_from` | `TIMESTAMPTZ (required)` | Row effective date |
| `valid_to` | `TIMESTAMPTZ` | Row expiry date (null = current version) |
| `is_current` | `BOOLEAN (required, default true)` | Current version flag |
| `row_hash` | `CHAR(64)` | Hash of `track` fields for change detection |

### For `dimension` + `scd 1` (dim_product)

No inferred columns — SCD Type 1 overwrites in place. The `natural_key` serves as the primary key.

### For `fact` (fact_sales, fact_inventory_snapshot)

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `etl_batch_id` | `BIGINT` | Load batch identifier for auditability |
| `loaded_at` | `TIMESTAMPTZ` | When this row was loaded |

### For `ref <dim>.<field>`

Each `ref` declaration infers a surrogate key FK column:

| Declaration | Inferred column | Type |
|------------|----------------|------|
| `ref dim_customer.customer_id` | `dim_customer_key` | `BIGINT (ref dim_customer.surrogate_key)` |
| `ref dim_product.sku` | `dim_product_key` | `BIGINT (ref dim_product.surrogate_key)` |
| `ref dim_store.store_id` | `dim_store_key` | `BIGINT (ref dim_store.surrogate_key)` |
| `ref dim_date.transaction_date` | `dim_date_key` | `BIGINT (ref dim_date.surrogate_key)` |

## Cross-Layer Imports

The `mart-customer-360.stm` file demonstrates cross-layer imports: `dim_customer` and `fact_sales` are schema blocks in their respective files, but appear on the source side of mappings in the mart. The `mapping` block's `source { }` / `target { }` determines data flow direction — not the file where the schema was originally defined.

Compare the Kimball mart with the Data Vault equivalent in `../datavault/mart-customer-360.stm`:

| Aspect | Kimball mart | Data Vault mart |
|--------|-------------|----------------|
| Imports | 2 blocks (dim + fact) | 3 blocks (hub + 2 satellites) |
| Dimension mapping | Direct pass-through — dim is already flat | Must join hub + satellites, resolve hash keys, filter to current |
| Enrichment | Aggregate from fact_sales | Merge attributes from separate satellites |
| Complexity | Low — heavy lifting done at dim load | Higher — vault is normalized by design |

## Comparison with Data Vault

The same RetailCo domain is modelled as a Data Vault in `../datavault/`. Key differences:

- **Kimball**: Dimensions are denormalized, query-optimized. Fact tables reference dimensions via surrogate keys. History is managed per-dimension via SCD types.
- **Data Vault**: Hubs hold business keys, satellites hold attributes, links hold relationships. Everything is insert-only with full history. More normalized, more resilient to source changes, but requires a mart layer for analytics queries.

Both approaches express cleanly in Satsuma. The same source schemas, the same transform logic — only the target structure and metadata tokens differ.
