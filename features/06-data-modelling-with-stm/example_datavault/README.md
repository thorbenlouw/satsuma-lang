# RetailCo International — Data Vault 2.0

A complete Data Vault 2.0 model for a multinational department store, expressed in STM using `@tag` conventions for hubs, links, satellites, effectivity patterns, and **information marts** that bridge the vault-to-Kimball boundary.

## The Story

RetailCo International operates 850+ stores across 12 countries, selling through both physical stores and an e-commerce platform. This model supports their raw data vault — a historically complete, auditable, source-system-aligned data store — and the **information mart** layer that reshapes vault data into star-schema-friendly structures for analytics consumers.

## Files

| File | Description | Key patterns demonstrated |
|------|-------------|--------------------------|
| `common.stm` | Shared hash transform (`dv_hash`), lookups | `transform` block with `nl()`, reusable across all vault loads |
| `hub-customer.stm` | Customer hub + 2 satellites from 3 sources | `@hub`, `@business_key`, `@satellite`, `@parent`, multi-source hub loading |
| `hub-product.stm` | Product hub + 2 satellites (attributes + pricing) | `@hub`, `@satellite`, split-by-rate-of-change pattern |
| `hub-store.stm` | Store hub + 1 satellite | `@hub`, `@satellite`, single-source, lookup enrichment |
| `link-sale.stm` | 3-way sale link + transaction satellite | `@link`, `@link(hub_customer, hub_product, hub_store)`, multi-source link loading |
| `link-inventory.stm` | Product-warehouse link + effectivity + stock satellite | `@link`, `@satellite`, `@effectivity`, `@driving_key` |
| **Information Mart Layer** | | |
| `mart-customer-360.stm` | Denormalized customer view from hub + 2 satellites | Vault entities as sources, Kimball `@dimension` on target, cross-satellite joins |
| `mart-sales.stm` | Transaction fact from link + satellite + hub joins | Vault entities as sources, Kimball `@fact`/`@ref`/`@measure` on target, hash key resolution |

## Source Systems

The same five source systems as the Kimball example — defined within each integration file:

- **Oracle Retail POS** (`pos_oracle`) — in-store transactions, store reference data
- **Shopify Plus** (`ecom_shopify`) — online orders, customer accounts
- **Salesforce Service Cloud** (`loyalty_sfdc`) — customer CRM, loyalty programme
- **SAP MM** (`merch_sap`) — product master, suppliers, pricing
- **Manhattan Associates WMS** (`wms_manhattan`) — warehouse inventory positions

## What Tooling Would Infer

The STM files contain **only business fields and descriptive attributes**. The following mechanical columns are inferred by tooling based on the `@tags` and are NOT written in the `.stm` files:

### For `@hub` (hub_customer, hub_product, hub_store)

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `{hub}_hk` | `CHAR(64) [pk]` | MD5 hash of business key(s) — the hub's primary key |
| `load_date` | `TIMESTAMPTZ [required]` | When this business key was first seen |
| `record_source` | `VARCHAR(100) [required]` | Which source system first provided this key |

Example: `hub_customer` gets `hub_customer_hk`, `load_date`, `record_source` — all inferred.

### For `@link` (link_sale, link_inventory)

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `{link}_hk` | `CHAR(64) [pk]` | MD5 hash of all participating hub keys |
| `{hub}_hk` (one per hub) | `CHAR(64) [ref: {hub}]` | Foreign key hash to each participating hub |
| `load_date` | `TIMESTAMPTZ [required]` | When this relationship was first seen |
| `record_source` | `VARCHAR(100) [required]` | Source system that established the relationship |

Example: `link_sale` (with `@link(hub_customer, hub_product, hub_store)`) gets `link_sale_hk`, `hub_customer_hk`, `hub_product_hk`, `hub_store_hk`, `load_date`, `record_source`.

### For `@satellite` (all satellites)

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `{parent}_hk` | `CHAR(64) [pk, ref: {parent}]` | Hash key FK to parent hub or link (part of composite PK) |
| `load_date` | `TIMESTAMPTZ [pk]` | Version timestamp (part of composite PK with parent hash key) |
| `load_end_date` | `TIMESTAMPTZ` | End-of-validity timestamp (null = current version) |
| `hash_diff` | `CHAR(64)` | Hash of all descriptive fields — used for change detection |
| `record_source` | `VARCHAR(100) [required]` | Source system for this version |

### For `@satellite @effectivity` (sat_inventory_effectivity)

Same as satellite, plus:

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `start_date` | `TIMESTAMPTZ [required]` | When the relationship became effective |
| `end_date` | `TIMESTAMPTZ` | When the relationship ended (null = still active) |
| `is_current` | `BOOLEAN [required, default: true]` | Convenience flag for active relationships |

The `@driving_key(hub_product)` tag on the effectivity satellite tells the load process which hub's key change should trigger end-dating. When a product is removed from a warehouse's assortment, only that specific product-warehouse relationship is end-dated.

## Data Vault Design Patterns Demonstrated

### Multi-source hub loading (hub-customer.stm)

Three sources feed the same hub with different resolution strategies:
- SFDC provides the golden business key directly
- POS resolves via loyalty card number lookup
- Shopify resolves via email address matching

Each source produces an independent `mapping -> hub_customer` block. The hub deduplicates on business key.

### Split by rate of change (hub-product.stm)

Product attributes (name, category, brand) change infrequently. Pricing changes with every promotion. Two satellites with `@parent(hub_product)` keep the histories separate — a price change doesn't create a new version of the attributes satellite.

### Multi-hub link (link-sale.stm)

A sale connects three business concepts: customer, product, and store. The `@link(hub_customer, hub_product, hub_store)` tag declares all participants. Online orders have a null store hub key — valid in DV2.0 (the "zero-key" pattern).

### Effectivity satellite (link-inventory.stm)

Tracks the temporal validity of the product-warehouse relationship. When a product is discontinued at a warehouse, the effectivity record is end-dated. This supports as-of queries without scanning the full satellite history.

### Vault-to-mart boundary (mart-customer-360.stm, mart-sales.stm)

This is where the Data Vault and Kimball tag systems meet. The mart files demonstrate the full architecture:

1. **Sources are vault entities** — hubs, links, and satellites are defined as `source` blocks with their full physical schema, including the hash keys, load dates, and hash diffs that were *inferred* during vault loading. From the mart's perspective, these columns are real and present.

2. **Targets use Kimball tags** — the mart output uses `@dimension`, `@fact`, `@grain`, `@ref`, and `@measure` tags, exactly like the Kimball examples. The mart IS a star schema — it just happens to be sourced from a vault rather than operational systems.

3. **Mapping handles the join logic** — the mapping blocks express the vault join pattern (link → satellite → hub) including current-version filtering (`load_end_date IS NULL`), LEFT JOINs for optional relationships, and hash-key-to-business-key resolution.

4. **Vault lineage preserved** — mart targets include the vault hash key as a non-functional column for traceability. An analyst can trace any mart row back to its vault source.

This demonstrates that STM doesn't force a modelling choice — it describes whatever architecture you're building. The same `@tag` vocabulary works on both sides of the vault-to-mart boundary.

## Tag Quick Reference

| Tag | Used on | Meaning |
|-----|---------|---------|
| `@hub` | Target block | Business key registry |
| `@link` | Target block | Relationship between hubs |
| `@satellite` | Target block | Descriptive attributes (versioned) |
| `@effectivity` | Target block (with `@satellite`) | Temporal validity of a link relationship |
| `@business_key(field)` | Inside hub | The durable business key |
| `@parent(entity)` | Inside satellite | Which hub or link this satellite belongs to |
| `@link(hub1, hub2, ...)` | Inside link | Which hubs participate in this relationship |
| `@scd(type: 2)` | Inside satellite | All satellites are implicitly SCD2, but explicit for clarity |
| `@driving_key(hub)` | Inside effectivity satellite | Which hub's key change drives end-dating |

## Comparison with Kimball

The same RetailCo domain is modelled as a Kimball star schema in `../example_kimball/`. Key differences:

- **Data Vault**: Insert-only, full history, source-aligned. Hubs and links capture structure; satellites capture change. Resilient to source system changes (new source = new satellite, no restructuring). Requires a business vault or mart layer for analytics.
- **Kimball**: Denormalized, query-optimized. History managed via SCD types on each dimension. Simpler for analytics queries but harder to extend when sources change.
- **The mart layer bridges both**: The `mart-*.stm` files in this example show that the two approaches aren't mutually exclusive. A vault feeds a mart, and the mart uses Kimball conventions. STM describes both layers with the same vocabulary.

Both approaches express cleanly in STM. The same source schemas, the same transform logic — only the target structure and tags differ.
