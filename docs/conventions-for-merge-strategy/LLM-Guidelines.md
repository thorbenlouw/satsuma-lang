# LLM Guidelines: Merge / Upsert Strategy Metadata Conventions

These guidelines tell an LLM how to interpret the free-form metadata tokens used in Satsuma mapping blocks that declare a merge or load strategy. None of these tokens are reserved keywords or enforced by the Satsuma grammar — they are **vocabulary conventions** that carry meaning by agreement.

## Core Principle

When you see metadata tokens like `merge upsert`, `match_on`, `delete_flag` in a mapping's `( )` block, they communicate **how the mapping loads data into its target**. Your job is to:

1. **Recognise the merge pattern** from the `merge` token
2. **Identify the matching key** from `match_on` (if applicable)
3. **Understand the match/no-match behaviour** from `on_match` and `on_no_match` (or their defaults)
4. **Generate the correct DML** for the target platform (MERGE, INSERT, TRUNCATE + INSERT, etc.)

## Token Interpretation Rules

### `merge upsert`

A mapping marked `(merge upsert)` performs an **insert-or-update** operation against the target.

**What it means:**
- Source rows are matched to existing target rows using the `match_on` key
- Rows that match are updated with the new values from the source
- Rows that do not match are inserted as new rows
- Existing target rows not present in the source are left untouched

**Companion tokens:**
- `match_on <field>` or `match_on {f1, f2}` — required. The business key used to find existing rows.
- `on_match <action>` — optional. Default: `update`. Alternatives: `skip` (do nothing), `error` (fail the load).
- `on_no_match <action>` — optional. Default: `insert`. Alternatives: `skip` (ignore new rows), `error` (fail the load).

**Generated code pattern (SQL):**
```sql
MERGE INTO target t
USING source s ON t.match_key = s.match_key
WHEN MATCHED THEN UPDATE SET t.col1 = s.col1, ...
WHEN NOT MATCHED THEN INSERT (col1, ...) VALUES (s.col1, ...);
```

**Example:**
```stm
mapping `customer upsert` (merge upsert, match_on customer_id) {
  source { `crm_customers` }
  target { `dim_customer` }

  customer_id -> customer_id
  full_name -> full_name
  email -> email { trim | lowercase }
  -> updated_at { now_utc() }
}
```

---

### `merge append`

A mapping marked `(merge append)` performs an **insert-only** operation. Every source row becomes a new target row.

**What it means:**
- No matching against existing target rows
- No updates or deletes
- Duplicate source records produce duplicate target rows (deduplication is the caller's responsibility)
- Ideal for event logs, audit trails, CDC streams, and immutable fact tables

**Companion tokens:**
- `match_on` — not used. If present, ignore it (but warn).
- `on_match` / `on_no_match` — not applicable.

**Generated code pattern (SQL):**
```sql
INSERT INTO target (col1, col2, ...)
SELECT s.col1, s.col2, ...
FROM source s;
```

**Example:**
```stm
mapping `page view events` (merge append) {
  source { `clickstream_raw` }
  target { `event_log` }

  event_id -> event_id
  user_id -> user_id
  page_url -> page_url
  event_timestamp -> event_timestamp
  -> ingested_at { now_utc() }
}
```

---

### `merge soft_delete`

A mapping marked `(merge soft_delete)` marks target rows as **logically deleted** rather than physically removing them.

**What it means:**
- Source rows are matched to existing target rows using the `match_on` key
- Rows present in the source that match a target row trigger an update to the delete flag and optional timestamp
- The mapping typically represents a deletion feed — the source contains records that should be marked as deleted
- No rows are physically removed from the target

**Companion tokens:**
- `match_on <field>` or `match_on {f1, f2}` — required. The business key for matching.
- `delete_flag <field>` — required. The boolean field on the target that is set to `true` when a row is deleted.
- `delete_timestamp <field>` — optional but recommended. A timestamp field set to the deletion time.
- `on_match` — default behaviour is to set the delete flag (and timestamp if declared). Override with `on_match skip` to conditionally skip.
- `on_no_match` — default: `insert`. This inserts the record as already-deleted if it never existed. Override with `on_no_match skip` to ignore unknown deletions.

**Generated code pattern (SQL):**
```sql
MERGE INTO target t
USING source s ON t.match_key = s.match_key
WHEN MATCHED THEN UPDATE SET
  t.delete_flag = TRUE,
  t.delete_timestamp = CURRENT_TIMESTAMP;
```

If `on_no_match insert` (the default):
```sql
WHEN NOT MATCHED THEN INSERT (match_key, delete_flag, delete_timestamp, ...)
VALUES (s.match_key, TRUE, CURRENT_TIMESTAMP, ...);
```

**Example:**
```stm
mapping `customer soft delete` (
  merge soft_delete,
  match_on customer_id,
  delete_flag is_deleted,
  delete_timestamp deleted_at
) {
  source { `crm_deleted_customers` }
  target { `dim_customer` }

  customer_id -> customer_id
  -> is_deleted { true }
  -> deleted_at { now_utc() }
}
```

---

### `merge full_refresh`

A mapping marked `(merge full_refresh)` performs a **truncate-and-reload** of the target.

**What it means:**
- All existing rows in the target are removed before loading
- The source is expected to contain the complete dataset
- No row-level matching occurs
- Simple and deterministically correct, but destructive if the source is incomplete

**Companion tokens:**
- `match_on` — not used. If present, ignore it.
- `on_match` / `on_no_match` — not applicable.
- Always check for safety notes in `note { }` blocks — full refresh mappings often include row-count thresholds or abort conditions.

**Generated code pattern (SQL):**
```sql
TRUNCATE TABLE target;

INSERT INTO target (col1, col2, ...)
SELECT s.col1, s.col2, ...
FROM source s;
```

Or, for platforms that support atomic swap:
```sql
CREATE TABLE target_staging AS SELECT ... FROM source;
ALTER TABLE target SWAP WITH target_staging;
DROP TABLE target_staging;
```

**Example:**
```stm
mapping `product catalog refresh` (merge full_refresh) {
  note {
    "If source returns fewer than 1,000 rows, abort and alert."
  }

  source { `product_master` }
  target { `dim_product` }

  sku -> sku
  product_name -> product_name { trim }
  category -> category
  -> refreshed_at { now_utc() }
}
```

---

### `match_on <field>` / `match_on {f1, f2}`

Declares the **business key** used to match source rows to existing target rows.

**What it means:**
- Single field: `match_on customer_id` — match on one column
- Composite key: `match_on {customer_id, effective_date}` — match on the combination
- The field name(s) refer to **target** fields. The source-to-target arrow for the match field must exist in the mapping body.
- This is the `ON` clause in a SQL `MERGE` statement

**Validation rules:**
- Required for `merge upsert` and `merge soft_delete`
- Not required (and ignored) for `merge append` and `merge full_refresh`
- Every field listed in `match_on` must appear as a target in an arrow (`-> field`) in the mapping body

---

### `on_match <action>`

Declares what to do when a source row matches an existing target row.

**What it means:**
- `on_match update` (default) — update all mapped target fields with source values
- `on_match skip` — leave the existing target row untouched
- `on_match error` — fail the load if a match occurs (useful for insert-only-with-key-check patterns)

**When omitted:** Default is `update` for `merge upsert`, and "set delete flags" for `merge soft_delete`.

---

### `on_no_match <action>`

Declares what to do when a source row has no match in the target.

**What it means:**
- `on_no_match insert` (default) — insert a new target row
- `on_no_match skip` — silently ignore the unmatched source row
- `on_no_match error` — fail the load if an unmatched row is found (useful for update-only patterns)

**When omitted:** Default is `insert`.

---

### `delete_flag <field>`

Identifies the **boolean field** on the target that marks a row as logically deleted.

**What it means:**
- The named field must exist on the target schema with a boolean-compatible type
- When a soft delete is triggered, this field is set to `true`
- Downstream queries should filter on `delete_flag = false` to see only active records

**Companion tokens:**
- `delete_timestamp <field>` — optional. Records when the deletion occurred.

---

### `delete_timestamp <field>`

Identifies the **timestamp field** on the target that records when a row was logically deleted.

**What it means:**
- The named field must exist on the target schema with a timestamp-compatible type
- When a soft delete is triggered, this field is set to the current timestamp
- Useful for audit trails and for determining how long a record has been in a deleted state

---

## Platform-Specific Code Generation

### Snowflake

```sql
-- merge upsert
MERGE INTO target t USING source s
  ON t.match_key = s.match_key
  WHEN MATCHED THEN UPDATE SET t.col1 = s.col1, ...
  WHEN NOT MATCHED THEN INSERT (col1, ...) VALUES (s.col1, ...);

-- merge full_refresh (prefer atomic swap)
CREATE OR REPLACE TABLE target_staging AS SELECT ... FROM source;
ALTER TABLE target SWAP WITH target_staging;
DROP TABLE target_staging;
```

### BigQuery

```sql
-- merge upsert
MERGE target t USING source s
  ON t.match_key = s.match_key
  WHEN MATCHED THEN UPDATE SET t.col1 = s.col1, ...
  WHEN NOT MATCHED THEN INSERT ROW;

-- merge full_refresh
TRUNCATE TABLE target;
INSERT INTO target SELECT ... FROM source;

-- merge append
INSERT INTO target SELECT ... FROM source;
```

### PostgreSQL

```sql
-- merge upsert (ON CONFLICT)
INSERT INTO target (col1, col2, ...)
SELECT s.col1, s.col2, ... FROM source s
ON CONFLICT (match_key) DO UPDATE SET col1 = EXCLUDED.col1, ...;

-- merge append
INSERT INTO target (col1, col2, ...)
SELECT s.col1, s.col2, ... FROM source s;

-- merge full_refresh
TRUNCATE TABLE target;
INSERT INTO target SELECT ... FROM source;
```

### Spark / Databricks (Delta Lake)

```python
# merge upsert
target.alias("t").merge(
    source.alias("s"), "t.match_key = s.match_key"
).whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()

# merge append
source.write.mode("append").saveAsTable("target")

# merge full_refresh
source.write.mode("overwrite").saveAsTable("target")
```

## Interaction with SCD Tokens

When a mapping carries both `merge` and `scd` tokens (from the Kimball dimensional modelling conventions), the SCD strategy takes precedence for history management:

| Combination | Behaviour |
|-------------|-----------|
| `merge upsert` + `scd 1` | Standard upsert — overwrite existing rows in place |
| `merge upsert` + `scd 2` | Insert a new version row on change; end-date the previous version |
| `merge upsert` + `scd 6` | Same as SCD 2, plus update `current_` overlay columns on all version rows |
| `merge soft_delete` + `scd 2` | Set `delete_flag` and `delete_timestamp` on the current version; end-date it as well |
| `merge append` + any `scd` | Unusual — the append produces raw rows; a downstream mapping should handle SCD logic |
| `merge full_refresh` + any `scd` | Unusual — full refresh destroys history. Flag as a potential design issue. |

When `scd` is present, the LLM should generate version management logic (surrogate keys, valid_from/to, is_current) as specified in the Kimball LLM Guidelines, layered on top of the merge pattern.

## Validation Rules

These rules should be enforced by code generators and linters:

1. **`match_on` is required for `merge upsert` and `merge soft_delete`.** Emit an error if missing.
2. **`match_on` is ignored for `merge append` and `merge full_refresh`.** Emit a warning if present.
3. **`delete_flag` is required for `merge soft_delete`.** Emit an error if missing.
4. **`delete_timestamp` is optional for `merge soft_delete`.** Recommend it if missing, but do not error.
5. **Every `match_on` field must have a corresponding arrow** in the mapping body. The match key must be populated by the mapping.
6. **`on_match` and `on_no_match` only apply to `merge upsert` and `merge soft_delete`.** Ignore them for `merge append` and `merge full_refresh`.
7. **A mapping should declare exactly one `merge` token.** If none is present, warn that the load strategy is ambiguous. If multiple are present, error.
