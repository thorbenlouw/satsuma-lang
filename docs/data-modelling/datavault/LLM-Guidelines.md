# LLM Guidelines: Data Vault 2.0 Metadata Conventions

These guidelines tell an LLM how to interpret the free-form metadata tokens used in Satsuma files that follow Data Vault 2.0 conventions. None of these tokens are reserved keywords or enforced by the Satsuma grammar — they are **vocabulary conventions** that carry meaning by agreement.

## Core Principle

When you see metadata tokens like `hub`, `satellite`, `link` in a schema's `( )` block, they communicate the **structural role** of that schema in a Data Vault architecture. Your job is to:

1. **Recognise the pattern** from the tokens
2. **Infer the mechanical columns** that the pattern implies (but that are omitted from the Satsuma file)
3. **Understand the relationships** between schemas based on `parent`, `link_hubs`, `business_key`, etc.

## Token Interpretation Rules

### `hub`

A schema marked `(hub)` is a **business key registry** — a Data Vault hub table.

**What it means:**
- Contains one or more durable business keys that uniquely identify a business entity
- Is the central anchor point that satellites and links reference
- Receives records from one or more source systems
- Deduplicates on business key — first-in wins

**Companion tokens:**
- `business_key <field>` — identifies which field(s) are the business key. Required.

**Inferred columns** (not written in the Satsuma file, but present in the physical table):
- `{schema_name}_hk` CHAR(64) — MD5/SHA-256 hash of the business key(s). This is the primary key.
- `load_date` TIMESTAMPTZ — timestamp when this business key was first seen in the vault.
- `record_source` VARCHAR(100) — identifier for the source system that first provided this key.

**Example:**
```
schema hub_customer (hub, business_key customer_id) {
  customer_id  VARCHAR(50)  (required)
}
```
Physical table has: `hub_customer_hk`, `customer_id`, `load_date`, `record_source`.

---

### `satellite`

A schema marked `(satellite)` holds **descriptive attributes** that change over time — a Data Vault satellite.

**What it means:**
- Contains the business-meaningful attributes for a hub or link
- Every change to any attribute creates a new version (insert-only)
- Tracks history via load dates and hash diffs
- Always belongs to exactly one parent hub or link

**Companion tokens:**
- `parent <hub_or_link>` — which hub or link this satellite belongs to. Required.
- `scd 2` — explicitly marks SCD Type 2 behaviour. Optional (satellites are implicitly SCD2).

**Inferred columns:**
- `{parent}_hk` CHAR(64) — foreign key hash to the parent hub or link. Part of composite PK.
- `load_date` TIMESTAMPTZ — when this version was loaded. Part of composite PK.
- `load_end_date` TIMESTAMPTZ — when this version was superseded. NULL means current.
- `hash_diff` CHAR(64) — hash of all descriptive fields. Used for change detection.
- `record_source` VARCHAR(100) — source system for this version.

**Example:**
```
schema sat_customer_demographics (satellite, parent hub_customer, scd 2) {
  first_name   VARCHAR(100)
  email        VARCHAR(255)  (pii)
}
```
Physical table has: `hub_customer_hk`, `load_date`, `first_name`, `email`, `load_end_date`, `hash_diff`, `record_source`.

---

### `link`

A schema marked `(link)` captures a **relationship** between two or more hubs — a Data Vault link.

**What it means:**
- Represents a business relationship or transaction connecting multiple business entities
- May have its own degenerate attributes (e.g., transaction_id)
- Is the anchor for transactional satellites
- Links are insert-only — relationships are never deleted, only end-dated via effectivity satellites

**Companion tokens:**
- `link_hubs {hub1, hub2, ...}` — declares which hubs participate. Required.

**Inferred columns:**
- `{schema_name}_hk` CHAR(64) — hash of all participating hub hash keys (+ any degenerate keys). Primary key.
- `{hub}_hk` CHAR(64) — one foreign key hash per participating hub.
- `load_date` TIMESTAMPTZ — when this relationship was first seen.
- `record_source` VARCHAR(100) — source system that established the relationship.

**Example:**
```
schema link_sale (link, link_hubs {hub_customer, hub_product, hub_store}) {
  transaction_id  VARCHAR(30)  (required)
  line_number     INTEGER      (required)
}
```
Physical table has: `link_sale_hk`, `hub_customer_hk`, `hub_product_hk`, `hub_store_hk`, `transaction_id`, `line_number`, `load_date`, `record_source`.

---

### `effectivity`

Combined with `satellite`, marks an **effectivity satellite** that tracks the temporal validity of a link relationship.

**What it means:**
- Tracks when a relationship (link) becomes active and when it ends
- Used for "as-of" queries: "What was the state of this relationship on date X?"
- The satellite itself may carry no business fields — all columns are inferred

**Companion tokens:**
- `parent <link>` — which link this effectivity tracks. Required.
- `driving_key <hub>` — which hub's key change drives end-dating. Optional but recommended.

**Additional inferred columns** (beyond standard satellite columns):
- `start_date` TIMESTAMPTZ — when the relationship became effective.
- `end_date` TIMESTAMPTZ — when the relationship ended. NULL means still active.
- `is_current` BOOLEAN — convenience flag (true when end_date is NULL).

---

### `driving_key <hub>`

For effectivity satellites: identifies which hub's key change should trigger end-dating.

**Example:** `(driving_key hub_product)` on an inventory effectivity satellite means: when a product is removed from a warehouse's assortment, end-date that specific product-warehouse relationship.

---

## Mapping Conventions

### `record_source` in mappings

Every mapping to a hub, link, or satellite should include:
```
-> record_source { "SOURCE_SYSTEM_NAME" }
```
This populates the inferred `record_source` column. Use a consistent identifier for each source system.

### Hub key resolution in link mappings

When mapping to a link, source fields are mapped to the business keys of the participating hubs. Tooling resolves these to hub hash keys automatically. For example:
```
LOYALTY_CARD_NBR -> customer_id { "Resolve loyalty card to SFDC ContactId" }
SKU -> sku { trim }
```
The LLM or tooling knows that `customer_id` maps to `hub_customer` and `sku` maps to `hub_product` based on the `link_hubs` declaration and the `business_key` tokens on the referenced hubs.

### Current-version filtering in mart mappings

When a mart mapping reads from a satellite, the convention is to filter to the current version:
```
note { "Filter: sat_customer_demographics.load_end_date IS NULL" }
```
This selects only the most recent satellite record for each parent hash key.

## Cross-Layer Import Rules

When a schema marked `hub`, `link`, or `satellite` is imported into another file:

1. **Inferred fields travel with the import.** A hub's `{hub}_hk` and `load_date` are available in mappings even though they don't appear in the Satsuma source file.
2. **Any schema can appear on either side of a mapping.** A schema defined as a vault target in one file can be a mapping source in a mart file. The `mapping` block's `source { }` / `target { }` determines data flow direction.
3. **Hash key joins are conventional.** When a mart mapping references `hub_customer.customer_id`, the LLM understands this involves joining through `hub_customer_hk`.

## How to Generate DDL from These Conventions

When generating physical DDL from a Data Vault Satsuma file:

1. Read the schema-level metadata tokens to determine the entity type (hub/link/satellite)
2. Add the inferred columns documented above to the field list
3. Set primary keys according to the pattern (single hash key for hubs/links, composite hash key + load_date for satellites)
4. Add foreign key references from satellites to their parent, and from links to their participating hubs
5. Hash algorithm, column naming, and type choices are configurable — the conventions documented here are sensible defaults
