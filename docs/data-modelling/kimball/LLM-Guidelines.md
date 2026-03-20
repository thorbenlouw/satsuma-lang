# LLM Guidelines: Kimball Dimensional Modelling Metadata Conventions

These guidelines tell an LLM how to interpret the free-form metadata tokens used in Satsuma files that follow Kimball dimensional modelling conventions. None of these tokens are reserved keywords or enforced by the Satsuma grammar — they are **vocabulary conventions** that carry meaning by agreement.

## Core Principle

When you see metadata tokens like `dimension`, `fact`, `grain` in a schema's `( )` block, they communicate the **structural role** of that schema in a Kimball star schema. Your job is to:

1. **Recognise the pattern** from the tokens
2. **Infer the mechanical columns** that the pattern implies (but that are omitted from the Satsuma file)
3. **Understand the relationships** between schemas based on `ref`, `grain`, `natural_key`, etc.
4. **Classify measures** using `measure additive`, `measure semi_additive`, or `measure non_additive`

## Token Interpretation Rules

### `dimension`

A schema marked `(dimension)` is a **dimension table** in the Kimball sense.

**What it means:**
- Contains descriptive attributes used to filter, group, and label fact data
- Has a durable business key (identified by `natural_key`)
- May have a surrogate key (inferred for SCD Type 2 and 6)
- Change history is managed according to the `scd` token

**Companion tokens:**
- `natural_key <field>` — the business key used to identify a record across versions. Required.
- `scd N` — the Slowly Changing Dimension strategy. Required.
- `conformed` — marks the dimension as shared across multiple star schemas. Optional, informational.
- `track {field, ...}` — fields that trigger a new version when changed (SCD 2/6). Optional; if omitted, all non-key fields are tracked.
- `ignore {field, ...}` — fields that do NOT trigger a new version. Optional.

---

### `scd N` (Slowly Changing Dimension)

Specifies the history management strategy for a dimension.

**`scd 1` — Overwrite:**
- Changes overwrite the existing row in place
- No history is preserved
- No inferred columns — the `natural_key` is the primary key

**`scd 2` — Version with history:**
- Changes create a new row; the old row is end-dated
- Inferred columns:
  - `surrogate_key` BIGINT (pk, auto) — auto-incrementing surrogate primary key
  - `valid_from` TIMESTAMPTZ (required) — when this version became current
  - `valid_to` TIMESTAMPTZ — when this version was superseded (NULL = current)
  - `is_current` BOOLEAN (required, default true) — convenience flag
  - `row_hash` CHAR(64) — hash of tracked fields for efficient change detection

**`scd 6` — Hybrid (current overlay on Type 2):**
- Same as Type 2, plus a `current_{field}` column for each tracked field
- The current overlay provides the latest value on every row without needing a filter

**Example:**
```
schema dim_customer (dimension, scd 2, natural_key customer_id, track {email, phone}) {
  customer_id  VARCHAR(50)  (required)
  email        VARCHAR(255) (pii)
  phone        VARCHAR(20)  (pii)
  name         VARCHAR(200)
}
```
Physical table has: `surrogate_key`, `customer_id`, `email`, `phone`, `name`, `valid_from`, `valid_to`, `is_current`, `row_hash`.

Change detection: a new version is created only when `email` or `phone` changes (because of `track`). A change to `name` does NOT trigger a new version unless `name` is also in the `track` list.

---

### `conformed`

Marks a dimension as **conformed** — shared and reused across multiple star schemas.

**What it means:**
- This dimension represents a single agreed-upon definition of a business entity
- Multiple fact tables reference the same conformed dimension
- Changes to the dimension affect all star schemas that use it

This token is informational — it does not change the inferred columns.

---

### `fact`

A schema marked `(fact)` is a **fact table** — a table of measurements at a specific grain.

**What it means:**
- Contains quantitative measures (amounts, counts, quantities)
- Has a defined grain (the combination of fields that uniquely identifies a row)
- References one or more dimensions via surrogate key foreign keys
- May contain degenerate dimension attributes (stored directly on the fact)

**Companion tokens:**
- `grain {field, ...}` — the grain of the fact table. Required.
- `ref <dim>.<field>` — declares a dimension reference. One per dimension. Each infers a surrogate key FK column.
- `snapshot periodic` or `snapshot accumulating` — for snapshot fact types. Optional.

**Inferred columns:**
- `etl_batch_id` BIGINT — load batch identifier for auditability
- `loaded_at` TIMESTAMPTZ — when this row was loaded

**For each `ref <dim>.<field>`:**
- `{dim}_key` BIGINT (ref {dim}.surrogate_key) — surrogate key FK to the dimension

**Example:**
```
schema fact_sales (
  fact,
  grain {transaction_id, line_number},
  ref dim_customer.customer_id,
  ref dim_product.sku
) {
  transaction_id  VARCHAR(30)  (required)
  line_number     INTEGER      (required)
  customer_id     VARCHAR(50)
  sku             VARCHAR(18)  (required)
  quantity        INTEGER      (required, measure additive)
  net_amount      DECIMAL(12,2) (required, measure additive)
}
```
Physical table adds: `dim_customer_key`, `dim_product_key`, `etl_batch_id`, `loaded_at`.

---

### `snapshot periodic` / `snapshot accumulating`

Combined with `fact`, marks a snapshot fact table.

**`snapshot periodic`:**
- Full state captured at regular intervals (daily, weekly, etc.)
- Measures are typically semi-additive (summable across non-time dimensions, but not across time)

**`snapshot accumulating`:**
- Tracks lifecycle milestones for a process (e.g., order placed → shipped → delivered)
- Contains multiple date columns for each milestone

---

### `grain {field, ...}`

Declares the **grain** of a fact table — the combination of fields that uniquely identifies a row.

**What it means:**
- These fields together form a unique constraint
- Every measure in the fact is at this grain
- The grain determines what "one row" represents

**Example:** `(grain {snapshot_date, sku, warehouse_id})` means one row per product per warehouse per day.

---

### `ref <dim>.<field>`

Declares a **dimension reference** (foreign key relationship) from a fact to a dimension.

**What it means:**
- The fact's `<field>` is the business key that joins to the dimension's `natural_key`
- Tooling infers a surrogate key FK column: `{dim}_key` BIGINT
- At load time, the ETL resolves the business key to the dimension's current surrogate key

**Example:** `(ref dim_customer.customer_id)` means the fact joins to `dim_customer` via `customer_id`, and tooling adds a `dim_customer_key` FK column.

---

### Field-Level Tokens

#### `measure additive`

A fully additive measure — can be summed across all dimensions.

**Examples:** revenue, quantity, discount_amount.

#### `measure semi_additive`

A semi-additive measure — can be summed across some dimensions but **not across time**.

**Examples:** inventory on hand, account balance. You can sum inventory across warehouses, but summing Monday's + Tuesday's stock is meaningless.

**How to aggregate across time:** Use AVG, MIN, MAX, or LAST instead of SUM.

#### `measure non_additive`

A non-additive measure — cannot be meaningfully summed across any dimension.

**Examples:** unit price, margin percentage, ratios.

**How to aggregate:** Use weighted averages, or aggregate the underlying additive components separately.

#### `degenerate`

A **degenerate dimension attribute** — a dimension value stored directly on the fact table rather than in a separate dimension table.

**What it means:**
- This field provides dimensional context (filtering, grouping) but doesn't warrant its own dimension table
- Common for transaction identifiers, order numbers, channel codes

**Examples:** `channel VARCHAR(20) (degenerate)`, `payment_type VARCHAR(20) (degenerate)`.

---

## Mapping Conventions

### Computed fields use `-> target { NL }`

When a target field has no single source, omit the left side of the arrow:
```
-> gross_amount { "QTY * UNIT_PRICE" }
-> is_active { "True if LIFECYCLE_STATUS is 'ACTIVE', false otherwise" }
```

### Lookups are expressed in natural language

Reference data lookups don't use a special function — describe them in NL:
```
MATKL -> department { "Look up department from `product_hierarchy` using MATKL" }
```

### Value maps use `map { }`

Discrete value translations use the `map` block:
```
STATUS -> status {
  map { A: "active", T: "temporarily_closed", C: "closed" }
}
```

## Cross-Layer Import Rules

When a schema marked `dimension` or `fact` is imported into another file:

1. **Inferred fields travel with the import.** A dimension's `surrogate_key`, `valid_from`, etc. are available in mappings.
2. **Any schema can appear on either side of a mapping.** A schema defined as a target in one file can be a source in a mart file.
3. **Surrogate key lookups are conventional.** When a mart mapping references `dim_customer.customer_id`, the LLM understands this involves looking up the current surrogate key.

## How to Generate DDL from These Conventions

When generating physical DDL from a Kimball Satsuma file:

1. Read the schema-level metadata tokens to determine the entity type (dimension/fact)
2. For `dimension` + `scd 2`: add surrogate key, valid_from/to, is_current, row_hash
3. For `fact`: add etl_batch_id, loaded_at, and a surrogate key FK for each `ref`
4. Set primary keys: surrogate_key for SCD2 dimensions, natural_key for SCD1, grain fields for facts
5. For `track` fields: include them in the row_hash calculation
6. For `ignore` fields: exclude them from the row_hash — changes to these fields do not trigger a new version
7. Column naming, surrogate key types, and hash algorithms are configurable defaults
