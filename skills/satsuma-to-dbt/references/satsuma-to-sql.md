# Satsuma to SQL Translation

Translate Satsuma arrows and transform bodies into SQL SELECT expressions for dbt models.
Always consult `dialect-map.md` for warehouse-specific function names.

## Arrow classification → SQL pattern

### `[none]` — Direct copy

```satsuma
field_a -> field_b
```
→
```sql
source.field_a as field_b
```

If source and target names are identical, just `source.field_a`.

### `[none]` with rename only

```satsuma
CUST_ID -> customer_id
```
→
```sql
source.cust_id as customer_id
```

### Multi-source arrow

```satsuma
first_name, last_name -> full_name { "Concat @first_name + ' ' + @last_name" }
```
→
```sql
concat(source.first_name, ' ', source.last_name) as full_name
```

### Computed field (no source)

```satsuma
-> ingest_timestamp { now_utc }
```
→
```sql
current_timestamp() as ingest_timestamp
```

```satsuma
-> is_deleted { true }
```
→
```sql
true as is_deleted
```

## Pipe chain → nested SQL functions

Pipe chains read left-to-right. In SQL, the innermost function is the leftmost
pipe step:

```satsuma
email -> email { trim | lowercase | validate_email | null_if_invalid }
```
→
```sql
case
    when regexp_like(lower(trim(source.email)), '^[A-Za-z0-9._%+-]+@...$')
    then lower(trim(source.email))
    else null
end as email
```

For readability in complex chains, use a CTE:

```sql
with email_cleaned as (
    select
        *,
        lower(trim(email)) as _email_cleaned
    from source
)
select
    case
        when regexp_like(_email_cleaned, '^[A-Za-z0-9._%+-]+@...$')
        then _email_cleaned
        else null
    end as email
from email_cleaned
```

### Common pipe → SQL translations

| Pipe step | SQL |
|---|---|
| `trim` | `TRIM(x)` |
| `lowercase` | `LOWER(x)` |
| `uppercase` | `UPPER(x)` |
| `title_case` | `INITCAP(x)` |
| `coalesce(v)` | `COALESCE(x, v)` |
| `coalesce(false)` | `COALESCE(x, FALSE)` |
| `null_if_empty` | `NULLIF(x, '')` |
| `null_if_invalid` | Wrap preceding chain in CASE WHEN + validation |
| `warn_if_invalid` | Same as null_if_invalid but add `-- WARNING` comment |
| `error_if_null` | Add `not_null` test in schema YAML |
| `error_if_invalid` | Add custom test in schema YAML |
| `round` / `round(n)` | `ROUND(x)` / `ROUND(x, n)` |
| `* 100` | `x * 100` (arithmetic in pipe) |
| `to_string` | `CAST(x AS VARCHAR)` |
| `to_number` | `CAST(x AS NUMERIC)` |
| `validate_email` | Regex check (see dialect-map.md) |
| `to_e164` | NL — generate TODO with comment |
| `now_utc` / `now_utc()` | `CURRENT_TIMESTAMP()` |
| `replace(a, b)` | `REPLACE(x, 'a', 'b')` |
| `pad_left(n, c)` | `LPAD(x, n, 'c')` |
| `split(d) \| first` | `SPLIT_PART(x, 'd', 1)` |
| `split(d) \| last` | `SPLIT_PART(x, 'd', -1)` — check dialect |
| `max_length(n)` | `LEFT(x, n)` |

### Pipes that become tests instead of SQL

Some Satsuma pipes are better expressed as dbt tests than inline SQL:

| Pipe step | dbt test |
|---|---|
| `error_if_null` | `tests: [not_null]` in schema YAML |
| `error_if_invalid` | Custom test on the column |
| `drop_if_null` | `WHERE x IS NOT NULL` filter in model |
| `drop_if_invalid` | `WHERE <validation>` filter in model |
| `warn_if_null` | `tests: [{not_null: {severity: warn}}]` |
| `warn_if_invalid` | `tests: [{<test>: {severity: warn}}]` |

## Map blocks → CASE WHEN

```satsuma
type -> type_name {
  map { R: "retail", B: "business", G: "government", null: "retail", _: "unknown" }
}
```
→
```sql
case
    when source.type = 'R' then 'retail'
    when source.type = 'B' then 'business'
    when source.type = 'G' then 'government'
    when source.type is null then 'retail'
    else 'unknown'
end as type_name
```

### Range-based maps

```satsuma
amount -> bucket { map { < 100: "low", < 1000: "mid", default: "high" } }
```
→
```sql
case
    when source.amount < 100 then 'low'
    when source.amount < 1000 then 'mid'
    else 'high'
end as bucket
```

## Named transforms (spread)

```satsuma
transform clean_email {
  trim | lowercase | validate_email | null_if_invalid
}

email -> email { ...clean_email }
```

In dbt, implement as a macro:

```sql
-- macros/clean_email.sql
{% macro clean_email(column) %}
case
    when regexp_like(lower(trim({{ column }})), '^...$')
    then lower(trim({{ column }}))
    else null
end
{% endmacro %}

-- In the model:
{{ clean_email('source.email') }} as email
```

## NL transforms → best-effort SQL

For transforms described in natural language, attempt a SQL translation but ALWAYS:
1. Include the original NL text as a SQL comment above the expression.
2. Add a `-- REVIEW:` marker after the expression.
3. If you're not confident, wrap it in a `-- TODO:` instead.

```satsuma
-> display_name {
  "If @CUST_TYPE is R or null, concat @FIRST_NM + ' ' + @LAST_NM.
   Otherwise use @COMPANY_NM. Trim and title-case."
}
```
→
```sql
-- NL: "If CUST_TYPE is R or null, concat FIRST_NM + LAST_NM.
--      Otherwise use COMPANY_NM. Trim and title-case."
initcap(trim(
    case
        when source.cust_type = 'R' or source.cust_type is null
        then concat(source.first_nm, ' ', source.last_nm)
        else source.company_nm
    end
)) as display_name
-- REVIEW: auto-generated from NL — verify logic
```

## each/flatten blocks → lateral flatten or UNNEST

### flatten

```satsuma
flatten line_items -> order_line_facts {
  .line_number -> line_number
  .sku -> sku { trim | uppercase }
}
```

**Snowflake:**
```sql
select
    source.event_id as order_id,
    item.value:line_number::int as line_number,
    upper(trim(item.value:sku::string)) as sku
from source,
lateral flatten(input => source.line_items) as item
```

**BigQuery:**
```sql
select
    source.event_id as order_id,
    item.line_number,
    upper(trim(item.sku)) as sku
from source,
unnest(source.line_items) as item
```

**For relational sources** (no nested arrays), flatten typically means a JOIN:
```sql
select
    orders.order_id,
    lines.line_number,
    upper(trim(lines.sku)) as sku
from {{ ref('stg_orders') }} as orders
inner join {{ ref('stg_order_lines') }} as lines
    on orders.order_id = lines.order_id
```

## Source block filters → WHERE clauses

```satsuma
source {
  order_events
  "WHERE @order_events.order_status = completed"
}
```
→
```sql
with source as (
    select * from {{ ref('stg_order_events') }}
    where order_status = 'completed'
)
```

## Schema-level filters on fields

```satsuma
line_items list_of record (filter item_status != "cancelled") { ... }
```

This is a pre-mapping filter. In dbt, apply it as a WHERE in the CTE that reads
this field:
```sql
-- Pre-filter: exclude cancelled line items per schema definition
where item_status != 'cancelled'
```
