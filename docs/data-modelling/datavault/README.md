# RetailCo International — Data Vault 2.0

A complete Data Vault 2.0 model for a multinational department store, expressed in STM v2 using free-form metadata conventions for hubs, links, satellites, effectivity patterns, and **information marts** that bridge the vault-to-Kimball boundary.

## How it works

STM v2 uses `( )` metadata blocks for **all** annotations — there are no special `@tag` annotations or reserved modelling keywords. Tokens like `hub`, `satellite`, `link`, `scd` are free-form vocabulary interpreted by an LLM, not by a deterministic parser. This means:

- The **grammar doesn't change** when you add new modelling patterns
- The **meaning of tokens is conventional**, not enforced — see [LLM-Guidelines.md](LLM-Guidelines.md) for how an LLM should interpret them
- **Tooling infers mechanical columns** (hash keys, load dates, etc.) based on these conventions — they are never written in the STM file

## Files

| File | Description | Key conventions demonstrated |
|------|-------------|------------------------------|
| `platform.stm` | Platform entry point — imports all pipeline schemas | Namespace-qualified imports, lineage traversal |
| `common.stm` | Shared hash transform (`dv_hash`), lookups | `transform` block with NL, reusable across all vault loads |
| `hub-customer.stm` | Customer hub + 2 satellites from 3 sources | `hub`, `business_key`, `satellite`, `parent`, multi-source loading |
| `hub-product.stm` | Product hub + 2 satellites (attributes + pricing) | `hub`, `satellite`, split-by-rate-of-change pattern |
| `hub-store.stm` | Store hub + 1 satellite | `hub`, `satellite`, single-source, lookup enrichment |
| `link-sale.stm` | 3-way sale link + transaction satellite | `link`, `link_hubs {h1, h2, h3}`, multi-source link loading |
| `link-inventory.stm` | Product-warehouse link + effectivity + stock satellite | `link`, `satellite`, `effectivity`, `driving_key` |
| **Information Mart Layer** | | |
| `mart-customer-360.stm` | Denormalized customer view from hub + 2 satellites | Cross-layer `import`, Kimball `dimension` on target, vault schemas as mapping sources |
| `mart-sales.stm` | Transaction fact from link + satellite + hub joins | Cross-layer `import` from 3 vault files, Kimball `fact`/`ref`/`measure`, hash key resolution |

## Metadata Convention Quick Reference

These are **vocabulary tokens** in `( )` metadata — not reserved keywords. An LLM interprets their meaning. See [LLM-Guidelines.md](LLM-Guidelines.md) for the full interpretation rules.

### Schema-level tokens

| Token | Meaning | Example |
|-------|---------|---------|
| `hub` | Business key registry | `schema hub_customer (hub, business_key customer_id) { ... }` |
| `link` | Relationship between hubs | `schema link_sale (link, link_hubs {hub_customer, hub_product}) { ... }` |
| `satellite` | Descriptive attributes (versioned) | `schema sat_demographics (satellite, parent hub_customer, scd 2) { ... }` |
| `effectivity` | Temporal validity of a link | `schema sat_eff (satellite, effectivity, parent link_inventory) { ... }` |
| `business_key <field>` | The durable business key | `(business_key customer_id)` |
| `parent <entity>` | Which hub or link a satellite belongs to | `(parent hub_customer)` |
| `link_hubs {h1, h2}` | Which hubs participate in a link | `(link_hubs {hub_customer, hub_product})` |
| `scd 2` | Slowly Changing Dimension type | `(scd 2)` |
| `driving_key <hub>` | For effectivity: which hub drives end-dating | `(driving_key hub_product)` |

## What Tooling Would Infer

The STM files contain **only business fields and descriptive attributes**. The following mechanical columns are inferred by convention:

### For `hub` (hub_customer, hub_product, hub_store)

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `{hub}_hk` | `CHAR(64) (pk)` | MD5 hash of business key(s) — the hub's primary key |
| `load_date` | `TIMESTAMPTZ (required)` | When this business key was first seen |
| `record_source` | `VARCHAR(100) (required)` | Which source system first provided this key |

### For `link` (link_sale, link_inventory)

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `{link}_hk` | `CHAR(64) (pk)` | MD5 hash of all participating hub keys |
| `{hub}_hk` (one per hub) | `CHAR(64) (ref {hub})` | Foreign key hash to each participating hub |
| `load_date` | `TIMESTAMPTZ (required)` | When this relationship was first seen |
| `record_source` | `VARCHAR(100) (required)` | Source system that established the relationship |

### For `satellite` (all satellites)

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `{parent}_hk` | `CHAR(64) (pk, ref {parent})` | Hash key FK to parent hub or link |
| `load_date` | `TIMESTAMPTZ (pk)` | Version timestamp (part of composite PK) |
| `load_end_date` | `TIMESTAMPTZ` | End-of-validity (null = current version) |
| `hash_diff` | `CHAR(64)` | Hash of all descriptive fields for change detection |
| `record_source` | `VARCHAR(100) (required)` | Source system for this version |

### For `satellite` + `effectivity`

Same as satellite, plus:

| Inferred column | Type | Purpose |
|----------------|------|---------|
| `start_date` | `TIMESTAMPTZ (required)` | When the relationship became effective |
| `end_date` | `TIMESTAMPTZ` | When the relationship ended (null = still active) |
| `is_current` | `BOOLEAN (required, default true)` | Convenience flag for active relationships |

## Data Vault Design Patterns Demonstrated

### Multi-source hub loading (hub-customer.stm)

Three sources feed the same hub with different resolution strategies:
- SFDC provides the golden business key directly
- POS resolves via loyalty card number lookup
- Shopify resolves via email address matching

Each source produces an independent mapping block. The hub deduplicates on business key.

### Split by rate of change (hub-product.stm)

Product attributes (name, category, brand) change infrequently. Pricing changes with every promotion. Two satellites with `parent hub_product` keep the histories separate.

### Multi-hub link (link-sale.stm)

A sale connects three business concepts: customer, product, and store. The `link_hubs {hub_customer, hub_product, hub_store}` token declares all participants.

### Effectivity satellite (link-inventory.stm)

Tracks the temporal validity of the product-warehouse relationship. The `driving_key hub_product` token tells the load process which hub's key change drives end-dating.

### Vault-to-mart boundary (mart-customer-360.stm, mart-sales.stm)

Cross-layer imports bring vault schemas into mart files as mapping sources. The mart targets use Kimball conventions (`dimension`, `fact`, `grain`, `ref`, `measure`). STM describes both layers with the same vocabulary.

## Comparison with Kimball

The same RetailCo domain is modelled as a Kimball star schema in `../kimball/`. Key differences:

- **Data Vault**: Insert-only, full history, source-aligned. Hubs and links capture structure; satellites capture change. Resilient to source system changes.
- **Kimball**: Denormalized, query-optimized. History managed via SCD types on each dimension. Simpler for analytics queries but harder to extend.
- **The mart layer bridges both**: The `mart-*.stm` files show the two approaches aren't mutually exclusive. A vault feeds a mart, and the mart uses Kimball conventions.
