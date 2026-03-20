# Data Modelling with Satsuma

Satsuma expresses data modelling patterns — Kimball star schemas, Data Vault 2.0, and hybrids — through **free-form metadata conventions**, not grammar changes. The language's `( )` metadata blocks carry vocabulary tokens (`dimension`, `hub`, `fact`, `satellite`, etc.) that communicate structural intent to both humans and LLMs.

This directory contains two complete, production-grade examples of the same retail domain modelled in both approaches:

| Directory | Approach | Files |
|-----------|----------|-------|
| [`kimball/`](kimball/) | Kimball star schema — dimensions, facts, SCD patterns | 9 Satsuma files |
| [`datavault/`](datavault/) | Data Vault 2.0 — hubs, links, satellites, effectivity | 11 Satsuma files |

Both model **RetailCo International**, a multinational department store with 850+ stores, 5 source systems, and the same business domain — enabling direct comparison of how each approach handles the same data.

## How Satsuma Handles Data Modelling

Satsuma takes a three-layer approach:

### 1. Business fields in the Satsuma file

The `.stm` file contains **only business-meaningful fields and mapping logic**. Mechanical columns (surrogate keys, hash keys, load dates, validity ranges, row hashes) are never written — they are inferred by convention from the metadata tokens.

```stm
schema dim_customer (dimension, conformed, scd 2, natural_key customer_id) {
  customer_id  VARCHAR(50)  (required)
  email        VARCHAR(255) (pii)
  loyalty_tier VARCHAR(20)
}
```

A BA reads this and sees "customer dimension with ID, email, and loyalty tier". An engineer reads the tokens and knows there will be a `surrogate_key`, `valid_from`, `valid_to`, `is_current`, and `row_hash` in the physical table.

### 2. Metadata tokens in `( )` blocks

Tokens are free-form vocabulary — the Satsuma grammar treats them as opaque strings. Their meaning is established by convention and documented in per-example **LLM-Guidelines.md** files. This means:

- **No grammar changes** when new modelling patterns are added
- **No reserved keywords** — `dimension`, `hub`, `fact` are conventions, not syntax
- **Extensible** — teams can define domain-specific tokens using the same mechanism

### 3. LLM-Guidelines for interpretation

Each example set includes an `LLM-Guidelines.md` that tells an AI exactly how to interpret the tokens — what columns to infer, what relationships exist, and how to generate DDL or other artefacts. This is the bridge between human-readable Satsuma and machine-actionable metadata.

## The RetailCo Domain

Both examples model the same fictional company to enable direct comparison.

**RetailCo International** operates 850+ department stores across 12 countries, selling through physical stores and e-commerce.

### Source Systems

| System | Technology | Description |
|--------|-----------|-------------|
| `pos_oracle` | Oracle Retail POS | In-store transactions (~2M/day) |
| `ecom_shopify` | Shopify Plus | Online orders (~200K/day) |
| `loyalty_sfdc` | Salesforce Service Cloud | Customer profiles and loyalty (18M members) |
| `merch_sap` | SAP MM | Product master data (~500K active SKUs) |
| `wms_manhattan` | Manhattan Associates WMS | Warehouse inventory (24 distribution centres) |

## Kimball vs Data Vault in Satsuma

| Aspect | Kimball ([kimball/](kimball/)) | Data Vault ([datavault/](datavault/)) |
|--------|--------|------------|
| **Core entities** | Dimensions + facts | Hubs + links + satellites |
| **Schema tokens** | `dimension`, `fact`, `grain`, `ref`, `scd` | `hub`, `link`, `satellite`, `parent`, `link_hubs`, `effectivity` |
| **History** | Per-dimension SCD types | Insert-only satellites with load dates |
| **Normalization** | Denormalized, query-optimized | Highly normalized, load-optimized |
| **Analytics** | Direct star schema queries | Requires information mart layer |
| **Source resilience** | Dimension restructure on source change | Hub/link stable; only satellites change |
| **Mart layer** | Optional (already query-friendly) | Required for analytics consumption |

Both approaches share:
- The same source schemas (same 5 systems, same field structures)
- The same transform logic (same lookups, value maps, computed fields)
- Cross-layer imports for downstream consumption
- A `platform.stm` entry point for lineage traversal

## Convention Dictionary

The full token dictionaries are documented in:
- [kimball/LLM-Guidelines.md](kimball/LLM-Guidelines.md) — `dimension`, `fact`, `scd`, `grain`, `ref`, `measure`, `degenerate`
- [datavault/LLM-Guidelines.md](datavault/LLM-Guidelines.md) — `hub`, `link`, `satellite`, `parent`, `link_hubs`, `effectivity`, `driving_key`

### Shared conventions

| Token | Applies to | Meaning |
|-------|-----------|---------|
| `scd N` | Schema metadata | Slowly Changing Dimension strategy (1, 2, or 6) |
| `natural_key <field>` | Schema metadata | Business key for record identity |
| `business_key <field>` | Schema metadata | Alias for `natural_key` (preferred in Data Vault) |
| `track {fields}` | Schema metadata | Fields that trigger a new version (SCD 2/6) |
| `ignore {fields}` | Schema metadata | Fields that do NOT trigger a new version |

## Platform Entry Points

Each example includes a `platform.stm` that imports every schema in the pipeline:

```stm
// kimball/platform.stm
import { dim_customer } from "dim-customer.stm"
import { fact_sales } from "fact-sales.stm"
import { mart_customer_360 } from "mart-customer-360.stm"
// ...
```

These entry points enable platform-wide lineage traversal:

```bash
satsuma lineage --from dim_customer kimball/
satsuma lineage --from hub_customer datavault/
```

## Using These Examples as Templates

When building a new data platform with Satsuma:

1. **Choose your approach** — Kimball for simpler analytics-first pipelines, Data Vault for complex multi-source environments that need full auditability.
2. **Copy the relevant example set** as a starting point.
3. **Replace the RetailCo domain** with your own source systems, entities, and business rules.
4. **Keep the metadata conventions** — the tokens and inference rules are designed to be reusable across domains.
5. **Write an LLM-Guidelines.md** if you introduce domain-specific tokens.
6. **Create a `platform.stm`** entry point so `satsuma lineage` can trace the full pipeline.

For AI agents: the LLM-Guidelines files are your primary reference for interpreting metadata tokens. When generating DDL, dbt models, or documentation from Satsuma files, follow the inference rules documented there.
