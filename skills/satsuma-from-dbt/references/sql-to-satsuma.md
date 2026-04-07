# SQL to Satsuma Translation Patterns

Use this reference when converting dbt model SQL into Satsuma arrows and transforms.
The goal is to capture intent, not reproduce SQL. When in doubt, use NL.

## Direct translations (use pipe syntax)

These SQL patterns have clean Satsuma equivalents. Prefer pipe syntax for these.

### String operations
```sql
-- SQL
TRIM(email)                        →  email -> email { trim }
LOWER(TRIM(email))                 →  email -> email { trim | lowercase }
UPPER(region)                      →  region -> region { uppercase }
INITCAP(name)                      →  name -> name { title_case }
LEFT(phone, 10)                    →  phone -> phone { truncate(10) }
LPAD(code, 5, '0')                →  code -> code { pad_left(5, "0") }
REPLACE(val, 'old', 'new')        →  val -> val { replace("old", "new") }
CONCAT(first, ' ', last)          →  first, last -> full_name { "Concat @first + ' ' + @last" }
```

### Null handling
```sql
COALESCE(amount, 0)                →  amount -> amount { coalesce(0) }
NULLIF(status, '')                 →  status -> status { null_if_empty }
-- For COALESCE across multiple columns, use NL:
COALESCE(mobile, home, work)       →  mobile, home, work -> phone { "Use first non-null of @mobile, @home, @work" }
```

### Type conversions
```sql
CAST(id AS VARCHAR)                →  id -> id { to_string }
CAST(amount AS DECIMAL)            →  amount -> amount { to_number }
CAST(flag AS BOOLEAN)              →  flag -> flag { to_boolean }
ROUND(amount, 2)                   →  amount -> amount { round(2) }
```

### CASE → map
```sql
CASE
  WHEN type = 'R' THEN 'retail'
  WHEN type = 'B' THEN 'business'
  ELSE 'unknown'
END AS customer_type
```
→
```satsuma
type -> customer_type {
  map { R: "retail", B: "business", _: "unknown" }
}
```

For range-based CASE:
```sql
CASE
  WHEN amount < 100 THEN 'small'
  WHEN amount < 1000 THEN 'medium'
  ELSE 'large'
END
```
→
```satsuma
amount -> size_bucket {
  map { < 100: "small", < 1000: "medium", default: "large" }
}
```

### Timestamps
```sql
CURRENT_TIMESTAMP                  →  -> ingest_ts { now_utc }
DATE_TRUNC('month', order_date)    →  order_date -> order_month { "Truncate @order_date to month" }
```

### Identity / rename
```sql
SELECT customer_id AS cust_id      →  customer_id -> cust_id
SELECT * (passthrough)             →  -- map each field individually
```

## NL descriptions (use for complex SQL)

These patterns are too complex or varied for pipe syntax. Write clear NL with @refs.

### Window functions
```sql
ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn
```
→
```satsuma
-> row_num {
  "Row number partitioned by @customer_id, ordered by @order_date descending"
}
```

### Aggregations
```sql
SUM(amount) AS total_amount
COUNT(DISTINCT customer_id) AS customer_count
```
→
```satsuma
-> total_amount { "Sum of @amount" }
-> customer_count { "Count distinct @customer_id" }
```

### Multi-table joins (expressed in source block, not arrows)
```sql
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN products p ON o.product_id = p.product_id
```
→
```satsuma
source {
  orders
  customers
  products
  "Left join @orders to @customers on @orders.customer_id = @customers.customer_id.
   Left join @orders to @products on @orders.product_id = @products.product_id."
}
```

### Subqueries and CTEs
Don't try to represent CTE structure in Satsuma. Describe the end result:
```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (...) AS rn
  FROM orders
)
SELECT * FROM ranked WHERE rn = 1
```
→
```satsuma
-> order_id {
  "Most recent order per @customer_id, deduplicated by @order_date descending"
}
```

### Conditional logic beyond simple CASE
```sql
CASE
  WHEN status = 'active' AND balance > 0 THEN 'paying'
  WHEN status = 'active' AND balance = 0 THEN 'free'
  WHEN status = 'churned' AND last_active > DATEADD(day, -30, CURRENT_DATE) THEN 'recently_churned'
  ELSE 'inactive'
END
```
→
```satsuma
status, balance, last_active -> account_state {
  "Active with positive @balance → 'paying'.
   Active with zero @balance → 'free'.
   Churned within last 30 days (based on @last_active) → 'recently_churned'.
   Otherwise → 'inactive'."
}
```

## Patterns to flag with warnings

| SQL pattern | Satsuma treatment |
|---|---|
| `SELECT *` | `//! SELECT * — columns may change without notice` |
| Hardcoded dates | `//! Hardcoded date in transform — may need updating` |
| `LIMIT` in non-test context | `//! LIMIT clause — data may be incomplete` |
| UDF calls | `//? Custom UDF — verify @udf_name behavior` |
| Dynamic SQL / Jinja logic | `//? Jinja conditional — multiple code paths exist` |
