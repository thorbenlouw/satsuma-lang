# Modelling Conventions Reference

When reverse-engineering a dbt project into Satsuma, use these token dictionaries
to annotate schemas with structural metadata. This enables downstream tools and
agents to understand the data modelling intent without reading SQL.

## Kimball Tokens

Apply these when the dbt project follows Kimball star schema conventions.

### Schema-level

| Token | When to apply | Example |
|---|---|---|
| `dimension` | Model name starts with `dim_` or is a Type 2 snapshot | `(dimension)` |
| `fact` | Model name starts with `fact_` or `fct_` | `(fact)` |
| `conformed` | Dimension referenced by multiple fact models | `(conformed)` |
| `scd 1` | Dimension with `materialized='table'` and no history tracking | `(scd 1)` |
| `scd 2` | Dimension with snapshots, surrogate keys, or valid_from/to columns | `(scd 2)` |
| `natural_key <field>` | The business key (from `unique_key` config or unique test) | `(natural_key customer_id)` |
| `track {fields}` | Fields included in snapshot `check_cols` or hash diff | `(track {email, phone})` |
| `ignore {fields}` | Fields explicitly excluded from change detection | `(ignore {last_login})` |
| `grain {fields}` | Fact table grain (from unique test on composite key) | `(grain {transaction_id, line_number})` |
| `ref dim_x.field` | Fact references a dimension (from JOIN in SQL) | `(ref dim_customer.customer_id)` |

### Field-level

| Token | When to apply | Example |
|---|---|---|
| `measure additive` | Numeric field that's summed in downstream queries | `(measure additive)` |
| `measure semi_additive` | Balance/inventory field (sum across non-time dims only) | `(measure semi_additive)` |
| `measure non_additive` | Ratio, percentage, unit price | `(measure non_additive)` |
| `degenerate` | Dimensional attribute stored on the fact table | `(degenerate)` |

### Mechanical columns to OMIT

These columns exist in the physical table but should NOT be written in Satsuma.
They are inferred from the schema-level tokens:

- Surrogate keys (`surrogate_key`, `dim_*_key`)
- `valid_from`, `valid_to`, `is_current` (inferred from `scd 2`)
- `row_hash`, `hash_diff` (inferred from `scd 2`)
- `etl_batch_id`, `loaded_at` (inferred from `fact`)
- `dbt_valid_from`, `dbt_valid_to`, `dbt_updated_at` (dbt snapshot columns)

When converting, strip these and let the Satsuma conventions imply them.

## Data Vault Tokens

Apply these when the dbt project uses Data Vault 2.0 patterns (often via `dbtvault`
or `dbt_vault` packages).

### Schema-level

| Token | When to apply | Example |
|---|---|---|
| `hub` | Model name starts with `hub_` | `(hub, business_key customer_id)` |
| `satellite` | Model name starts with `sat_` | `(satellite, parent hub_customer)` |
| `link` | Model name starts with `link_` | `(link, link_hubs {hub_customer, hub_product})` |
| `effectivity` | Satellite tracking temporal validity of a link | `(satellite, effectivity, parent link_sale)` |
| `business_key <field>` | Hub's business key | `(business_key customer_id)` |
| `parent <hub_or_link>` | Satellite's parent entity | `(parent hub_customer)` |
| `link_hubs {hubs}` | Link's participating hubs | `(link_hubs {hub_customer, hub_product})` |
| `driving_key <hub>` | Effectivity satellite's driving key | `(driving_key hub_product)` |

### Mechanical columns to OMIT

- `*_hk` hash keys (inferred from `hub`, `link`, `satellite`)
- `load_date`, `load_end_date` (inferred from hub/satellite)
- `record_source` (inferred; populate via `-> record_source { "SYSTEM_NAME" }`)
- `hash_diff` (inferred from `satellite`)

## Merge Strategy Tokens

Map dbt materialization configs to Satsuma merge tokens.

| dbt Config | Satsuma Token |
|---|---|
| `materialized='incremental'` + `unique_key='x'` | `(merge upsert, match_on x)` |
| `materialized='incremental'` + `unique_key=['x','y']` | `(merge upsert, match_on {x, y})` |
| `materialized='incremental'` without `unique_key` | `(merge append)` |
| `materialized='incremental'` + `incremental_strategy='delete+insert'` | `(merge upsert, match_on <key>)` with note about delete+insert |
| `materialized='incremental'` + `incremental_strategy='merge'` | `(merge upsert, match_on <key>)` |
| `materialized='table'` | `(merge full_refresh)` |
| `materialized='view'` | No merge token |
| dbt snapshot with `strategy='check'` | `(merge upsert, match_on <unique_key>)` + `(scd 2, track {check_cols})` |
| dbt snapshot with `strategy='timestamp'` | `(merge upsert, match_on <unique_key>)` + `(scd 2)` |

For soft delete patterns, look for:
- An `is_deleted` or `deleted_at` column in the model
- Logic that sets a flag rather than filtering out rows
- → `(merge soft_delete, match_on <key>, delete_flag is_deleted)`

## Consumer Tokens (Reports & ML Models)

### dbt exposures → Satsuma consumer schemas

When the dbt project has an `exposures:` section in YAML:

```yaml
exposures:
  - name: weekly_sales_dashboard
    type: dashboard
    owner:
      name: Analytics Team
      email: analytics@company.com
    depends_on:
      - ref('fact_orders')
      - ref('dim_product')
    url: https://looker.company.com/dashboards/42
```

→

```satsuma
schema weekly_sales_dashboard (
  report,
  source {fact_orders, dim_product},
  tool looker,
  dashboard_id "42",
  owner "Analytics Team"
) {
  // Fields from the exposure description or inferred from source schemas
}
```

### Exposure type mapping

| dbt exposure type | Satsuma token |
|---|---|
| `dashboard` | `(report, tool <platform>)` |
| `notebook` | `(report, tool jupyter)` or `(model, tool jupyter)` |
| `analysis` | `(report)` |
| `ml` | `(model)` |
| `application` | `(report)` with note describing the application |

## Governance Tokens

### dbt meta → Satsuma governance

| dbt YAML meta key | Satsuma token |
|---|---|
| `pii: true` | `(pii)` |
| `classification: "RESTRICTED"` | `(classification "RESTRICTED")` |
| `owner: "team-name"` | `(owner "team-name")` |
| `retention: "3y"` | `(retention "3y")` |
| `encrypt: "AES-256"` | `(encrypt AES-256)` |
| `mask: "last_four"` | `(mask last_four)` |
| `compliance: ["GDPR", "SOX"]` | `(compliance {GDPR, SOX})` |
| `steward: "Jane Smith"` | `(steward "Jane Smith")` |
| Any other key-value | Carry as-is: `(key "value")` |

Apply at schema level or field level, matching where the meta appears in the dbt YAML.

If `pii` is present without `classification`, add `//! PII field without classification —
governance gap` to flag it.
