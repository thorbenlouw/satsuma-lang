# Codegen Assumptions

Every assumption the "LLM codegen" layer makes when generating DLT SQL from the
Data Vault STM files. Each assumption is tagged by the **analysis gap** it fills.

## Gap Categories

| Tag | Meaning |
|-----|---------|
| **INGEST** | Ingestion semantics — CDC vs snapshot, sequence column, file format |
| **DQ** | Data quality severity mapping — how `[required]`, `[enum:]` etc. become DLT expectations |
| **JOIN** | Join type derivation — how `note` blocks and `@parent`/`@link` tags map to SQL joins |
| **PHYSICAL** | Physical storage — catalog, schema, file format, partitioning, clustering |
| **NL** | `nl()` resolution — how natural-language transforms are turned into SQL |
| **HASH** | Hash key generation — algorithm, null handling, delimiter |
| **PATTERN** | Data Vault loading pattern — multi-source hubs, effectivity, zero-key |

---

## Assumptions

### A1 — Full daily snapshots (INGEST)

All five sources (`loyalty_sfdc`, `pos_oracle`, `ecom_shopify`, `merch_sap`,
`wms_manhattan`) are loaded as **full daily snapshots** via Auto Loader
(`cloud_files`). STM declares no CDC columns (`_cdc_operation`, `_cdc_timestamp`)
so we assume append-only snapshot files.

### A2 — Sequence column (INGEST)

`_metadata.file_modification_time` is used as the sequence column for
`APPLY CHANGES INTO` (satellite SCD2). This is the standard DLT pattern when
source files are immutable daily snapshots with no explicit sequence field.

### A3 — File format (INGEST)

All sources land as **Parquet** in a cloud storage path following the convention
`/mnt/landing/{source_name}/`. STM does not specify file format.

### A4 — DQ severity mapping (DQ)

| STM tag | DLT expectation | Rationale |
|---------|----------------|-----------|
| `[required]` | `EXPECT ... OR DROP` | Structural integrity — row is unusable without this field |
| `[enum: {...}]` | `EXPECT ... OR DROP` | Known-bad values indicate corrupt or misrouted data |
| `[pii]` | (no DQ rule) | PII is a classification tag, not a quality constraint |
| `[default: X]` | `COALESCE(col, X)` in transform | Default is applied in staging, not as a DQ rule |

### A5 — Catalog and schema (PHYSICAL)

Three Unity Catalog schemas under a single `retail_dv` catalog:

| Schema | Contents |
|--------|----------|
| `retail_dv.staging` | Bronze streaming tables (raw ingestion) |
| `retail_dv.raw_vault` | Hubs, links, satellites |
| `retail_dv.marts` | Information mart views |

### A6 — Hash key algorithm (HASH)

Directly from `common.stm` `dv_hash` transform:

```sql
MD5(UPPER(COALESCE(CAST(col1 AS STRING), 'N/A'))
    || '|' ||
    UPPER(COALESCE(CAST(col2 AS STRING), 'N/A'))
    || ...)
```

Implemented as a Python UDF `dv_hash()` registered in `_pipeline_config.py`.

### A7 — Hash diff for satellites (HASH)

Satellites use `hash_diff` (same MD5 algorithm) over **all non-key descriptive
columns** to detect changes. This is not in the STM but is standard DV2
practice and implied by `@scd(type: 2)`.

### A8 — Multi-source hub loading (PATTERN)

Hubs fed by multiple sources (`hub_customer` from 3 sources, `link_sale` from 2)
use `UNION ALL` of staging views, then deduplicate on business key with
`ROW_NUMBER() ... ORDER BY _load_ts` to keep the earliest record. This is
standard multi-source hub pattern.

### A9 — Zero-key pattern (PATTERN)

When a hub foreign key is NULL (e.g., anonymous POS customer, online order with
no store), we hash the string `'N/A'` to produce a **zero-key** hash. This is
standard DV2.0 — the zero-key row must exist in the hub.

### A10 — Effectivity satellite (PATTERN)

`sat_inventory_effectivity` uses DLT `APPLY CHANGES INTO` with:
- `start_date` = load timestamp when the SKU+warehouse combo first appears
- `end_date` = load timestamp when the combo disappears from source
- Detection: compare current snapshot against previous; absent combos are end-dated

Since DLT does not natively support "disappearance detection", we implement this
as a `MERGE` in a materialized view that compares today's staging snapshot
against yesterday's effectivity records.

### A11 — `nl()` transforms (NL)

| nl() text | Generated SQL | Confidence |
|-----------|--------------|------------|
| Loyalty card → SFDC ContactId lookup | `JOIN` on lookup table | `-- REVIEW:` — lookup table structure assumed |
| Email → SFDC ContactId match | `JOIN` on email + `UUID` fallback | `-- REVIEW:` — deterministic UUID function assumed |
| ISO 3166-2 normalization | `UPPER(TRIM(...))` placeholder | `-- REVIEW:` — full normalization needs reference data |
| ISO 3166 alpha-2 normalization | `UPPER(TRIM(...))` placeholder | `-- REVIEW:` — full normalization needs reference data |
| Currency conversion to USD | `col * exchange_rate` with `-- REVIEW:` | `-- REVIEW:` — requires `dim_exchange_rate` table |
| `gross_amount - discount_amount + tax_amount` | Direct SQL arithmetic | High — unambiguous |
| `quantity * unit_price` | Direct SQL arithmetic | High — unambiguous |
| `DATEDIFF(days, ...)` | Direct SQL `DATEDIFF` | High — unambiguous |
| `QTY_ON_HAND - QTY_RESERVED` floor at zero | `GREATEST(qty_on_hand - qty_reserved, 0)` | High — unambiguous |
| `QTY_ON_HAND * UNIT_COST` | Direct SQL arithmetic | High — unambiguous |

### A12 — Lookup tables (NL, PHYSICAL)

STM `lookup` blocks (`store_region_map`, `product_hierarchy`) are assumed to
exist as Delta tables in `retail_dv.staging`. They are loaded outside this
pipeline (reference data managed separately).

The loyalty-card-to-SFDC and email-to-SFDC resolution lookups implied by `nl()`
transforms are assumed to be maintained as `retail_dv.staging.customer_xref`
with columns `(match_key, match_type, customer_id)`.

### A13 — Transform functions (NL)

STM inline transforms (`trim`, `title_case`, `lowercase`, `coalesce()`, `map {}`,
`prepend()`, `to_e164`, `validate_email`, `null_if_invalid`) are translated to
SQL as follows:

| STM transform | SQL equivalent |
|--------------|----------------|
| `trim` | `TRIM(col)` |
| `title_case` | `INITCAP(col)` |
| `lowercase` | `LOWER(col)` |
| `coalesce(X)` | `COALESCE(col, X)` |
| `map { K: V, ... }` | `CASE WHEN col = 'K' THEN 'V' ... END` |
| `prepend("X")` | `CONCAT('X', CAST(col AS STRING))` |
| `to_e164` | `col` with `-- REVIEW: E.164 normalization not implemented` |
| `validate_email \| null_if_invalid` | `CASE WHEN col RLIKE '^[^@]+@[^@]+\\.[^@]+$' THEN col END` |

### A14 — Pipeline grouping (PHYSICAL)

The entire vault is one DLT pipeline (small example, ~15 tables). In production
this would be split into ingestion, raw vault, and mart pipelines. STM has no
`@pipeline` tag.

### A15 — Record source constant (PATTERN)

STM `=> record_source : "X"` mappings are implemented as literal string columns
in staging views. Each staging view adds `'X' AS record_source`.

### A16 — Mart join types (JOIN)

Derived from `note` blocks in mart mapping files:

| Mart | Join | Derivation |
|------|------|-----------|
| `mart_customer_360` | `hub_customer INNER JOIN sat_customer_demographics` | Primary mapping; every customer has demographics |
| `mart_customer_360` | `LEFT JOIN sat_customer_online` | Note says "not all customers have online accounts" |
| `mart_fact_sales` | `link_sale INNER JOIN sat_sale_detail` | Every link row has a satellite row |
| `mart_fact_sales` | `LEFT JOIN hub_customer` | Note says "anonymous POS purchases have no customer" |
| `mart_fact_sales` | `INNER JOIN hub_product` | Every sale has a product |
| `mart_fact_sales` | `LEFT JOIN hub_store` | Note says "online orders have no store" |
