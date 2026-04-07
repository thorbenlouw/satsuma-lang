# SQL Dialect Map

Use this reference when generating SQL for dbt models. The target warehouse affects
function names, type syntax, and merge behavior.

## Type Mappings

| Satsuma Type | Snowflake | BigQuery | Redshift | Databricks | PostgreSQL | DuckDB |
|---|---|---|---|---|---|---|
| `INT` / `INTEGER` | `INTEGER` | `INT64` | `INTEGER` | `INT` | `INTEGER` | `INTEGER` |
| `BIGINT` | `BIGINT` | `INT64` | `BIGINT` | `BIGINT` | `BIGINT` | `BIGINT` |
| `DECIMAL(p,s)` | `NUMBER(p,s)` | `NUMERIC(p,s)` | `DECIMAL(p,s)` | `DECIMAL(p,s)` | `NUMERIC(p,s)` | `DECIMAL(p,s)` |
| `STRING` / `STRING(n)` | `VARCHAR(n)` | `STRING` | `VARCHAR(n)` | `STRING` | `VARCHAR(n)` | `VARCHAR(n)` |
| `VARCHAR(n)` | `VARCHAR(n)` | `STRING` | `VARCHAR(n)` | `STRING` | `VARCHAR(n)` | `VARCHAR(n)` |
| `CHAR(n)` | `CHAR(n)` | `STRING` | `CHAR(n)` | `STRING` | `CHAR(n)` | `VARCHAR(n)` |
| `BOOLEAN` | `BOOLEAN` | `BOOL` | `BOOLEAN` | `BOOLEAN` | `BOOLEAN` | `BOOLEAN` |
| `DATE` | `DATE` | `DATE` | `DATE` | `DATE` | `DATE` | `DATE` |
| `TIMESTAMP` | `TIMESTAMP_NTZ` | `TIMESTAMP` | `TIMESTAMP` | `TIMESTAMP` | `TIMESTAMP` | `TIMESTAMP` |
| `TIMESTAMPTZ` | `TIMESTAMP_TZ` | `TIMESTAMP` | `TIMESTAMPTZ` | `TIMESTAMP` | `TIMESTAMPTZ` | `TIMESTAMPTZ` |
| `UUID` | `VARCHAR(36)` | `STRING` | `VARCHAR(36)` | `STRING` | `UUID` | `UUID` |
| `TEXT` | `TEXT` | `STRING` | `TEXT` | `STRING` | `TEXT` | `TEXT` |
| `ID` (Salesforce) | `VARCHAR(18)` | `STRING` | `VARCHAR(18)` | `STRING` | `VARCHAR(18)` | `VARCHAR(18)` |
| `PICKLIST` | `VARCHAR(255)` | `STRING` | `VARCHAR(255)` | `STRING` | `VARCHAR(255)` | `VARCHAR(255)` |

## Function Mappings

### String functions

| Satsuma pipe | Snowflake | BigQuery | Redshift | PostgreSQL |
|---|---|---|---|---|
| `trim` | `TRIM(x)` | `TRIM(x)` | `TRIM(x)` | `TRIM(x)` |
| `lowercase` | `LOWER(x)` | `LOWER(x)` | `LOWER(x)` | `LOWER(x)` |
| `uppercase` | `UPPER(x)` | `UPPER(x)` | `UPPER(x)` | `UPPER(x)` |
| `title_case` | `INITCAP(x)` | `INITCAP(x)` | `INITCAP(x)` | `INITCAP(x)` |
| `truncate(n)` | `LEFT(x, n)` | `LEFT(x, n)` | `LEFT(x, n)` | `LEFT(x, n)` |
| `max_length(n)` | `LEFT(x, n)` | `LEFT(x, n)` | `LEFT(x, n)` | `LEFT(x, n)` |
| `pad_left(n, c)` | `LPAD(x, n, c)` | `LPAD(x, n, c)` | `LPAD(x, n, c)` | `LPAD(x, n, c)` |
| `pad_right(n, c)` | `RPAD(x, n, c)` | `RPAD(x, n, c)` | `RPAD(x, n, c)` | `RPAD(x, n, c)` |
| `replace(a, b)` | `REPLACE(x, a, b)` | `REPLACE(x, a, b)` | `REPLACE(x, a, b)` | `REPLACE(x, a, b)` |
| `split(d)` | `SPLIT(x, d)` | `SPLIT(x, d)` | `SPLIT_PART(...)` | `STRING_TO_ARRAY(x, d)` |

### Null handling

| Satsuma pipe | All dialects |
|---|---|
| `coalesce(v)` | `COALESCE(x, v)` |
| `null_if_empty` | `NULLIF(x, '')` |
| `null_if_invalid` | Context-dependent — wrap in CASE |
| `error_if_null` | Wrap in assertion or test |

### Type conversion

| Satsuma pipe | Snowflake | BigQuery | Redshift | PostgreSQL |
|---|---|---|---|---|
| `to_string` | `TO_VARCHAR(x)` | `CAST(x AS STRING)` | `CAST(x AS VARCHAR)` | `x::TEXT` |
| `to_number` | `TO_NUMBER(x)` | `CAST(x AS NUMERIC)` | `CAST(x AS DECIMAL)` | `x::NUMERIC` |
| `to_boolean` | `TO_BOOLEAN(x)` | `CAST(x AS BOOL)` | `CAST(x AS BOOLEAN)` | `x::BOOLEAN` |
| `round(n)` | `ROUND(x, n)` | `ROUND(x, n)` | `ROUND(x, n)` | `ROUND(x, n)` |

### Timestamp functions

| Satsuma pipe | Snowflake | BigQuery | Redshift | PostgreSQL |
|---|---|---|---|---|
| `now_utc` / `now_utc()` | `CURRENT_TIMESTAMP()` | `CURRENT_TIMESTAMP()` | `GETDATE()` | `NOW()` |
| `to_utc` | `CONVERT_TIMEZONE('UTC', x)` | `TIMESTAMP(x, 'UTC')` | `CONVERT_TIMEZONE('UTC', x)` | `x AT TIME ZONE 'UTC'` |
| `to_iso8601` | `TO_VARCHAR(x, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')` | `FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', x)` | `TO_CHAR(x, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')` | `TO_CHAR(x, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')` |

### Hashing (for surrogate keys / Data Vault)

| Purpose | Snowflake | BigQuery | Redshift | PostgreSQL |
|---|---|---|---|---|
| Surrogate key | `MD5(x)` | `TO_HEX(MD5(x))` | `MD5(x)` | `MD5(x)` |
| Hash diff | `MD5(CONCAT_WS('\|', ...))` | `TO_HEX(MD5(CONCAT(...)))` | `MD5(...)` | `MD5(CONCAT_WS('\|', ...))` |
| UUID v5 | Not native — use UDF or `UUID_STRING()` | `GENERATE_UUID()` | Not native | `uuid_generate_v5()` |

### Email validation regex

| Dialect | Pattern |
|---|---|
| Snowflake | `RLIKE(x, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')` |
| BigQuery | `REGEXP_CONTAINS(x, r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')` |
| Redshift | `x ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'` |
| PostgreSQL | `x ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'` |

## Merge / Incremental Patterns

### Snowflake

```sql
-- merge upsert (dbt incremental with merge strategy)
{{ config(materialized='incremental', unique_key='id', incremental_strategy='merge') }}

-- merge append
{{ config(materialized='incremental', incremental_strategy='append') }}

-- merge full_refresh
{{ config(materialized='table') }}
```

### BigQuery

```sql
-- merge upsert
{{ config(materialized='incremental', unique_key='id', incremental_strategy='merge') }}

-- merge append
{{ config(materialized='incremental', incremental_strategy='insert_overwrite',
          partition_by={'field': 'event_date', 'data_type': 'date'}) }}
```

### Databricks

```sql
-- merge upsert (Delta Lake)
{{ config(materialized='incremental', unique_key='id', incremental_strategy='merge',
          file_format='delta') }}
```
