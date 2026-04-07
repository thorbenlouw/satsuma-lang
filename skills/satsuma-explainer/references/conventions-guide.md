# Conventions Guide

Satsuma uses free-form metadata tokens in `( )` blocks to express data modelling,
merge strategy, governance, and consumer patterns. These are vocabulary conventions,
not grammar keywords. This guide tells you how to recognise and explain each one.

## Detecting the modelling approach

Check schema-level metadata to identify the approach:

| Tokens found | Approach | Explain as |
|---|---|---|
| `dimension`, `fact`, `grain`, `scd` | Kimball star schema | "Facts surrounded by dimensions" |
| `hub`, `satellite`, `link` | Data Vault 2.0 | "Hubs, satellites, and links" |
| Neither | Flat / custom | Describe the flow without naming a methodology |
| Both | Hybrid | Note both approaches and explain which schemas use which |

## Kimball conventions

### Schema tokens and what they mean

| Token | Plain English |
|---|---|
| `(dimension)` | A reference table of descriptive attributes (customers, products, stores) |
| `(dimension, conformed)` | A shared dimension used across multiple fact tables — a single source of truth |
| `(fact)` | A table of measurements (sales, clicks, inventory counts) at a specific grain |
| `(scd 1)` | Changes overwrite the old value — no history is kept |
| `(scd 2)` | Changes create a new version — full history is preserved |
| `(scd 6)` | Hybrid: full history plus a current-value overlay on every row |
| `(natural_key field)` | The business identifier (e.g., customer_id) — what makes a record unique |
| `(track {f1, f2})` | Only changes to these fields trigger a new version |
| `(ignore {f1})` | Changes to these fields do NOT create a new version |
| `(grain {f1, f2})` | What one row of the fact table represents |
| `(ref dim_x.field)` | The fact references this dimension via a foreign key |

### Field tokens

| Token | Plain English |
|---|---|
| `(measure additive)` | Can be summed across any dimension (e.g., revenue) |
| `(measure semi_additive)` | Can be summed across some dimensions but NOT time (e.g., account balance) |
| `(measure non_additive)` | Cannot be meaningfully summed (e.g., unit price, percentage) |
| `(degenerate)` | A dimensional attribute stored on the fact table (e.g., order number) |

### Mechanical columns (inferred, not written)

For `(dimension, scd 2)`: surrogate_key, valid_from, valid_to, is_current, row_hash.
For `(fact)`: etl_batch_id, loaded_at, plus a surrogate key FK per `ref`.
For `(dimension, scd 1)`: natural_key is the primary key; no versioning columns.

These are NOT gaps — they are inferred from the tokens. Mention them in technical
explanations but do not flag their absence.

## Data Vault conventions

### Schema tokens and what they mean

| Token | Plain English |
|---|---|
| `(hub)` | A master registry of business keys (e.g., all customer IDs ever seen) |
| `(satellite, parent hub_x)` | Descriptive attributes for a hub, with full change history |
| `(link, link_hubs {h1, h2})` | A recorded relationship between two or more business entities |
| `(satellite, effectivity, parent link_x)` | Tracks when a relationship starts and ends |
| `(business_key field)` | The durable business identifier in a hub |
| `(driving_key hub_x)` | Which hub's key change triggers end-dating in an effectivity satellite |

### Mechanical columns (inferred, not written)

For hubs: {hub}_hk (hash key), load_date, record_source.
For satellites: {parent}_hk, load_date, load_end_date, hash_diff, record_source.
For links: {link}_hk, one {hub}_hk per participating hub, load_date, record_source.

## Merge strategy conventions

| Token | Plain English |
|---|---|
| `(merge upsert, match_on field)` | Insert new rows; update existing ones matched by the key |
| `(merge append)` | Every row is inserted — nothing is updated or deleted |
| `(merge soft_delete, match_on field, delete_flag f)` | Mark records as deleted instead of removing them |
| `(merge full_refresh)` | Wipe the target and reload everything from scratch |
| `(on_match update)` | When a match is found: update (this is the default) |
| `(on_match skip)` | When a match is found: leave the existing row untouched |
| `(on_no_match insert)` | When no match: insert a new row (this is the default) |
| `(on_no_match skip)` | When no match: ignore the source row |

### Dangerous combinations to flag

- `merge full_refresh` + `scd 2` → destroys version history. Always flag.
- `merge append` + `scd 2` → unusual; append creates raw rows, SCD2 logic must happen downstream.
- No `merge` token on a mapping to a persistent target → ambiguous load behavior. Flag.
- `match_on` present on `merge append` → ignored; warn user.

## Governance conventions

| Token | Plain English |
|---|---|
| `(pii)` | Contains personally identifiable information |
| `(classification "LEVEL")` | Sensitivity tier: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED |
| `(encrypt ALGO)` | Must be encrypted at rest with the specified algorithm |
| `(mask strategy)` | How to display the field to users without full access |
| `(retention "Ny")` | How long data is kept (field-level overrides schema-level) |
| `(owner "team")` | Team responsible for this data |
| `(steward "person")` | Individual data steward for governance decisions |
| `(compliance {GDPR, SOX})` | Regulatory frameworks that apply |

### Governance completeness checks

1. `pii` without `classification` → gap (sensitivity is undefined)
2. `RESTRICTED`/`CONFIDENTIAL` without `encrypt` and no note explaining why → gap
3. `pii` fields without `owner` on the schema → gap (no accountability)
4. `compliance` without `retention` → gap (regulated data needs lifecycle rules)
5. `pii` field on a `report`/`model` schema → exposure point (flag for review)

### Classification + masking interaction

- Users at or above the classification level see raw values
- Users below the level see the masked representation
- Users with no access don't see the field at all

## Consumer conventions (reports & ML models)

| Token | Plain English |
|---|---|
| `(report)` | A dashboard, report, or visualization — a leaf node in the lineage |
| `(model)` | An ML model — also a leaf node |
| `(source {s1, s2})` | Which upstream schemas this consumer reads from |
| `(tool platform)` | The BI or ML platform (Looker, Tableau, MLflow, etc.) |
| `(dashboard_id "id")` | The specific asset on the platform |
| `(refresh schedule "...")` | When the consumer is updated or retrained |
| `(registry platform)` | Where the ML model is versioned (MLflow, SageMaker, etc.) |
| `(experiment "name")` | The experiment or run identifier |

### What fields mean on consumers

On a `report`: fields are the measures and dimensions visible to users.
On a `model`: fields are input features and prediction outputs.

These are NOT storage columns — they describe the consumer's interface.

### Impact analysis through consumers

When explaining impact, always trace changes all the way to consumer schemas:
"If customer email changes, it flows through dim_customer to the customer risk
dashboard in Tableau, where it is visible to the risk-ops team."
