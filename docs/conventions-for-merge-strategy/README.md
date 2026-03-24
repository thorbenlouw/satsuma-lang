# Conventions for Merge / Upsert Strategy

## Why This Matters

Data pipelines do not simply copy rows from source to target. Every mapping must answer a fundamental question: **what happens when the target table already has data?** Without an explicit strategy, teams resort to verbal agreements, wiki pages, or comments buried in ETL code — all of which drift out of sync with the actual pipeline behaviour.

Satsuma addresses this by placing the merge strategy directly on the mapping block as metadata tokens in `( )`. Because the strategy lives alongside the field-level arrows that define the transformation, the full intent — what arrives, how it matches, and what happens on match or no match — is visible in one place. A reader (human or LLM) never has to cross-reference a separate configuration file to understand how a mapping loads its target.

Declaring merge strategy in Satsuma also gives downstream tooling a machine-readable signal. Code generators can emit the correct `MERGE`, `INSERT`, or `TRUNCATE + INSERT` statement for the target platform. Lineage tools can distinguish append-only audit streams from mutable dimension loads. Data quality monitors can validate that a mapping declared as `merge append` never updates existing rows.

## Metadata Conventions

All tokens below are **vocabulary conventions** in `( )` metadata — they are not reserved keywords or enforced by the Satsuma grammar. An LLM interprets their meaning. See [LLM-Guidelines.md](LLM-Guidelines.md) for the full interpretation rules.

### Mapping-level tokens

| Token | Meaning | Example |
|-------|---------|---------|
| `merge upsert` | Insert new rows, update existing rows on match | `(merge upsert, match_on customer_id)` |
| `merge append` | Insert-only — every record becomes a new row | `(merge append)` |
| `merge soft_delete` | Mark deleted records rather than removing them | `(merge soft_delete, match_on customer_id, delete_flag is_deleted)` |
| `merge full_refresh` | Truncate the target and reload from scratch | `(merge full_refresh)` |
| `match_on <field>` | Business key used to match source rows to existing target rows | `(match_on customer_id)` |
| `match_on {f1, f2}` | Composite business key for matching | `(match_on {customer_id, effective_date})` |
| `on_match <action>` | What to do when a source row matches an existing target row (default: `update`) | `(on_match update)` |
| `on_no_match <action>` | What to do when a source row has no match in the target (default: `insert`) | `(on_no_match insert)` |
| `delete_flag <field>` | Boolean field on the target that marks a row as logically deleted | `(delete_flag is_deleted)` |
| `delete_timestamp <field>` | Timestamp field on the target that records when a row was logically deleted | `(delete_timestamp deleted_at)` |

### Guidelines

- Always declare `merge` on any mapping that loads a persistent target. Omitting it forces the reader to guess.
- `match_on` is required for `merge upsert` and `merge soft_delete`. It is not needed for `merge append` (no matching) or `merge full_refresh` (no row-level comparison).
- When `on_match` or `on_no_match` are omitted, use the defaults: `on_match update` and `on_no_match insert`. Only add the tokens when you need non-default behaviour (e.g., `on_match skip` to ignore unchanged rows).
- Prefer `merge soft_delete` over physical deletes for any target that feeds analytics or audit. Always pair it with at least `delete_flag`; add `delete_timestamp` when downstream consumers need to know *when* the deletion occurred.
- Use a `note { }` block inside the mapping to explain any business rules around the merge strategy that are not captured by the tokens alone — for example, how to handle late-arriving data or what constitutes a "change" worth updating.

## How Natural Language Helps

Merge strategies often carry business rules that go beyond "insert or update." A `note { }` block inside the mapping is the right place for these:

- **Change detection criteria** — "Only update the target row if the source `updated_at` is newer than the target `last_modified_at`."
- **Conflict resolution** — "If the same `customer_id` arrives from two sources in the same batch, prefer the record with the later `event_timestamp`."
- **Soft delete semantics** — "A customer is considered deleted when they appear in the CRM `deleted_customers` feed. Set `is_deleted = true` and `deleted_at = now()`, but preserve all other fields."
- **Refresh safety** — "Full refresh runs nightly at 02:00 UTC. If the source returns fewer than 80% of the expected row count, abort the load and alert."

These rules belong in `" "` descriptions, not forced into metadata tokens.

## Patterns

### 1. Upsert (Insert + Update on Match)

The most common pattern for slowly changing reference data. New rows are inserted; existing rows (matched by business key) are updated with the latest values.

```stm
mapping 'customer upsert' (merge upsert, match_on customer_id) {
  source { `crm_customers` }
  target { `dim_customer` }

  customer_id -> customer_id
  full_name -> full_name { trim | title_case }
  email -> email { trim | lowercase }
  region -> region
  -> updated_at { now_utc() }
}
```

### 2. Append-Only (Event Log / Immutable Stream)

Every source record becomes a new row in the target. No matching, no updates. Used for event logs, audit trails, and immutable fact streams.

```stm
mapping 'page view events' (merge append) {
  source { `clickstream_raw` }
  target { `event_log` }

  event_id -> event_id
  user_id -> user_id
  page_url -> page_url { trim }
  event_timestamp -> event_timestamp
  -> ingested_at { now_utc() }
}
```

### 3. Soft Delete (Flag + Timestamp)

Rows are never physically removed from the target. When a record disappears from the source (or appears in a deletion feed), it is flagged as deleted. This preserves history for audit and analytics while keeping the "active" view clean.

```stm
mapping 'customer soft delete' (
  merge soft_delete,
  match_on customer_id,
  delete_flag is_deleted,
  delete_timestamp deleted_at
) {
  note {
    "Rows present in the CRM deleted_customers feed are marked as deleted.
     All other fields are preserved. Downstream queries should filter on
     is_deleted = false for the active customer view."
  }

  source { `crm_deleted_customers` }
  target { `dim_customer` }

  customer_id -> customer_id
  -> is_deleted { true }
  -> deleted_at { now_utc() }
}
```

### 4. Full Refresh with Safety Note

The target is truncated and reloaded from scratch on every run. Simple and correct, but risky if the source is incomplete or unavailable. Always pair with a safety note.

```stm
mapping 'product catalog refresh' (merge full_refresh) {
  note {
    """
    Full refresh from the product master system.

    **Safety rule:** If the source returns fewer than 1,000 rows, abort
    the load — the product catalog should never shrink below that
    threshold in normal operation. Alert the on-call engineer.
    """
  }

  source { `product_master` }
  target { `dim_product` }

  sku -> sku
  product_name -> product_name { trim }
  category -> category
  list_price -> list_price
  -> refreshed_at { now_utc() }
}
```

### 5. Composite Match Keys

When no single field uniquely identifies a target row, use a composite key in `match_on { }`. Common for time-variant data, multi-tenant systems, and bridge tables.

```stm
mapping 'price history upsert' (
  merge upsert,
  match_on {product_id, effective_date}
) {
  source { `pricing_feed` }
  target { `product_price_history` }

  product_id -> product_id
  effective_date -> effective_date
  list_price -> list_price
  discount_pct -> discount_pct
  -> updated_at { now_utc() }
}
```

## Canonical Example

See [`examples/merge-strategies.stm`](../../examples/merge-strategies.stm) for a complete, parseable Satsuma file that demonstrates all four merge patterns in a single retail scenario.
