# RetailCo International — Kimball Star Schema

A complete Kimball dimensional model for a multinational department store, expressed in STM using `@tag` conventions for dimensions, facts, and SCD patterns.

## The Story

RetailCo International operates 850+ stores across 12 countries, selling through both physical stores and an e-commerce platform. This model supports their analytics warehouse — enabling revenue reporting, inventory management, customer segmentation, and loyalty programme analysis.

## Files

| File | Description | Key patterns demonstrated |
|------|-------------|--------------------------|
| `common.stm` | Shared fragments (address, audit), lookups (regions, hierarchy, channels) | `fragment`, `lookup`, `import` |
| `dim-customer.stm` | Conformed customer dimension, SCD Type 2, fed by 3 sources | `@dimension`, `@conformed`, `@scd(type: 2)`, `@track`, `@ignore`, multi-source mapping |
| `dim-product.stm` | Product dimension with merchandise hierarchy, SCD Type 1 | `@dimension`, `@scd(type: 1)`, `@natural_key`, `lookup()` for hierarchy resolution |
| `dim-store.stm` | Store dimension, SCD Type 2 | `@dimension`, `@scd(type: 2)`, fragment spread, lookup enrichment |
| `fact-sales.stm` | Transaction-grain fact, multi-source (POS + e-commerce) | `@fact`, `@grain`, `@ref`, `@measure(additive\|non_additive)`, `@degenerate` |
| `fact-inventory.stm` | Daily periodic snapshot fact | `@fact`, `@snapshot(periodic)`, `@measure(semi_additive)` |
| **Information Mart Layer** | | |
| `mart-customer-360.stm` | Customer 360 enriched with transaction aggregates | Cross-layer `import` of dim + fact, RFM scoring, channel preference |

## Source Systems

All five source systems are defined within the integration files that consume them:

- **Oracle Retail POS** (`pos_oracle`) — in-store transactions, store reference data
- **Shopify Plus** (`ecom_shopify`) — online orders, customer accounts
- **Salesforce Service Cloud** (`loyalty_sfdc`) — customer CRM, loyalty programme
- **SAP MM** (`merch_sap`) — product master, suppliers, pricing
- **Manhattan Associates WMS** (`wms_manhattan`) — warehouse inventory positions

## What Tooling Would Infer

The STM files contain **only business fields**. The following mechanical columns are inferred by tooling based on the `@tags` and are NOT written in the `.stm` files:

### For `@dimension @scd(type: 2)` (dim_customer, dim_store)

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `surrogate_key` | `BIGINT [pk, auto]` | Auto-incrementing surrogate primary key |
| `valid_from` | `TIMESTAMPTZ [required]` | Row effective date — when this version became current |
| `valid_to` | `TIMESTAMPTZ` | Row expiry date — null means this is the current version |
| `is_current` | `BOOLEAN [required, default: true]` | Convenience flag for the current version |
| `row_hash` | `CHAR(64)` | Hash of `@track` fields for efficient change detection |

### For `@dimension @scd(type: 1)` (dim_product)

No inferred columns — SCD Type 1 simply overwrites in place. The `@natural_key` serves as the primary key.

### For `@fact` (fact_sales, fact_inventory_snapshot)

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `etl_batch_id` | `BIGINT` | Load batch identifier for auditability |
| `loaded_at` | `TIMESTAMPTZ` | When this row was loaded |

### For `@ref dim on field`

Each `@ref` declaration infers a surrogate key FK column:

| Declaration | Inferred column | Type |
|------------|----------------|------|
| `@ref dim_customer on customer_id` | `dim_customer_key` | `BIGINT [ref: dim_customer.surrogate_key]` |
| `@ref dim_product on sku` | `dim_product_key` | `BIGINT [ref: dim_product.surrogate_key]` |
| `@ref dim_store on store_id` | `dim_store_key` | `BIGINT [ref: dim_store.surrogate_key]` |
| `@ref dim_date on transaction_date` | `dim_date_key` | `BIGINT [ref: dim_date.surrogate_key]` |

## Tag Quick Reference

| Tag | Used on | Meaning |
|-----|---------|---------|
| `@dimension` | Schema block | This is a dimension table |
| `@conformed` | Schema block | Shared across star schemas |
| `@fact` | Schema block | This is a fact table |
| `@snapshot(periodic)` | Schema block | Periodic snapshot fact (semi-additive measures) |
| `@scd(type: N)` | Schema block | Slowly Changing Dimension strategy (1, 2, or 6) |
| `@natural_key(field)` | Inside schema block | Business key for the dimension |
| `@track(fields...)` | Inside schema block | Fields that trigger SCD versioning |
| `@ignore(fields...)` | Inside schema block | Fields that do NOT trigger versioning |
| `@grain(fields...)` | Inside schema block | Fact table grain |
| `@ref dim on field` | Inside schema block | Foreign key to a dimension |
| `@measure(type)` | On a field | Measure classification: additive, semi_additive, non_additive |
| `@degenerate` | On a field | Degenerate dimension attribute stored on the fact |

## Cross-Layer Imports

The `mart-customer-360.stm` file demonstrates cross-layer imports: `dim_customer` and `fact_sales` are `target` blocks in their respective files, but appear on the source side of mappings in the mart. Block keywords (`source`, `target`, etc.) are semantic sugar — the `mapping` syntax determines data flow direction.

Compare the Kimball mart with the Data Vault equivalent in `../example_datavault/mart-customer-360.stm`:

| Aspect | Kimball mart | Data Vault mart |
|--------|-------------|----------------|
| Imports | 2 blocks (dim + fact) | 3 blocks (hub + 2 satellites) |
| Dimension mapping | Direct pass-through — dim is already flat | Must join hub + satellites, resolve hash keys, filter to current |
| Enrichment | Aggregate from fact_sales | Merge attributes from separate satellites |
| Complexity | Low — heavy lifting done at dim load | Higher — vault is normalized by design |

Both produce a similar 360 view. The architectural trade-off: Kimball front-loads the denormalization (at dimension load time), Data Vault defers it (at mart build time).

## Comparison with Data Vault

The same RetailCo domain is modelled as a Data Vault in `../example_datavault/`. Key differences:

- **Kimball**: Dimensions are denormalized, query-optimized. Fact tables reference dimensions via surrogate keys. History is managed per-dimension via SCD types.
- **Data Vault**: Hubs hold business keys, satellites hold attributes, links hold relationships. Everything is insert-only with full history. More normalized, more resilient to source changes, but requires a business vault or information mart layer for analytics queries.

Both approaches express cleanly in STM. The same source schemas, the same transform logic — only the target structure and tags differ.
