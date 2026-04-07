# Merge Strategy to dbt Materialization

Maps Satsuma merge tokens to dbt model configurations.

## Core Mapping

| Satsuma merge token | dbt materialization | Key config |
|---|---|---|
| `merge upsert` | `incremental` | `unique_key`, `incremental_strategy='merge'` |
| `merge append` | `incremental` | No `unique_key`, `incremental_strategy='append'` |
| `merge soft_delete` | `incremental` | `unique_key` from `match_on`, custom soft-delete logic |
| `merge full_refresh` | `table` | No incremental logic needed |
| No merge token | `view` (staging) or `table` (marts) | Decide by layer |

## Detailed Patterns

### merge upsert

```satsuma
mapping `customer upsert` (merge upsert, match_on customer_id) { ... }
```
→
```sql
{{
    config(
        materialized='incremental',
        unique_key='customer_id',
        incremental_strategy='merge',
        on_schema_change='append_new_columns'
    )
}}

with source as (
    select * from {{ ref('stg_crm__customers') }}
)

select
    customer_id,
    full_name,
    email,
    current_timestamp() as updated_at
from source

{% if is_incremental() %}
where updated_at > (select max(updated_at) from {{ this }})
{% endif %}
```

**on_match / on_no_match mapping:**

| Satsuma | dbt behavior |
|---|---|
| `on_match update` (default) | Standard merge — `WHEN MATCHED THEN UPDATE` |
| `on_match skip` | Add `merge_exclude_columns` or use `insert_overwrite` |
| `on_no_match insert` (default) | Standard — `WHEN NOT MATCHED THEN INSERT` |
| `on_no_match skip` | Use `incremental_predicates` to filter unmatched rows |

### merge append

```satsuma
mapping `events` (merge append) { ... }
```
→
```sql
{{
    config(
        materialized='incremental',
        incremental_strategy='append'
    )
}}

select
    event_id,
    user_id,
    event_timestamp,
    current_timestamp() as ingested_at
from {{ ref('stg_events') }}

{% if is_incremental() %}
where event_timestamp > (select max(event_timestamp) from {{ this }})
{% endif %}
```

Note: even append-only models need an `is_incremental()` filter to avoid
re-inserting historical data. Use the most natural timestamp field.

### merge soft_delete

```satsuma
mapping `customer delete` (
  merge soft_delete,
  match_on customer_id,
  delete_flag is_deleted,
  delete_timestamp deleted_at
) { ... }
```

dbt doesn't have native soft-delete support. Two approaches:

**Approach A: Separate delete model (simpler)**
```sql
-- models/marts/dim_customer_deletes.sql
-- Run after dim_customer to apply soft deletes
{{
    config(
        materialized='incremental',
        unique_key='customer_id',
        incremental_strategy='merge',
        merge_update_columns=['is_deleted', 'deleted_at']
    )
}}

select
    customer_id,
    true as is_deleted,
    current_timestamp() as deleted_at
from {{ ref('stg_crm__deleted_customers') }}
```

**Approach B: Combined in main model (more complex)**
```sql
-- Combine active and deleted sources in one model
-- Use COALESCE and LEFT JOIN to handle both feeds
```

### merge full_refresh

```satsuma
mapping `product refresh` (merge full_refresh) { ... }
```
→
```sql
{{
    config(
        materialized='table'
    )
}}

select
    sku,
    trim(product_name) as product_name,
    category,
    current_timestamp() as refreshed_at
from {{ ref('stg_sap__products') }}
```

For full_refresh with a safety note (e.g., "abort if < 1000 rows"), generate
a custom test:

```sql
-- tests/assert_product_minimum_row_count.sql
select count(*)
from {{ ref('dim_product') }}
having count(*) < 1000
```

### Composite match keys

```satsuma
mapping `price upsert` (merge upsert, match_on {product_id, effective_date}) { ... }
```
→
```sql
{{
    config(
        materialized='incremental',
        unique_key=['product_id', 'effective_date'],
        incremental_strategy='merge'
    )
}}
```

## SCD interaction

When merge tokens appear alongside `scd` tokens, the SCD strategy governs
history management:

| Combination | dbt approach |
|---|---|
| `merge upsert` + `scd 1` | Standard incremental merge — overwrite in place |
| `merge upsert` + `scd 2` | Use dbt snapshot + downstream mart model (see SKILL.md Step 6) |
| `merge soft_delete` + `scd 2` | Snapshot + soft-delete model that end-dates the current version |
| `merge full_refresh` + `scd 2` | `//! Warning` — full refresh destroys history. Flag to user. |
| `merge append` + `scd 2` | Unusual — raw append feed; SCD2 logic in a downstream model |

## Warehouse-specific incremental strategies

| Strategy | Snowflake | BigQuery | Redshift | Databricks |
|---|---|---|---|---|
| `merge` (upsert) | `merge` | `merge` | `merge` | `merge` (Delta) |
| `append` | `append` | `append` | `append` | `append` |
| `delete+insert` | `delete+insert` | N/A | `delete+insert` | N/A |
| `insert_overwrite` | N/A | `insert_overwrite` | N/A | `insert_overwrite` |

Default to `merge` for upserts unless the user specifies otherwise.
