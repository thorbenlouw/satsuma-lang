---
name: satsuma-from-dbt
description: >
  Reverse-engineer Satsuma (.stm) mapping specs from an existing dbt project. Use this
  skill whenever the user wants to generate Satsuma from dbt, convert a dbt project to
  Satsuma, extract mapping specs from dbt models, document dbt transformations in Satsuma
  format, or create a Satsuma workspace from their existing dbt codebase. Also trigger
  when the user says things like "I have a dbt project and want to try Satsuma", "convert
  my dbt models to .stm", or "reverse-engineer my dbt lineage into Satsuma". Requires
  access to the dbt project files on disk. The `satsuma` CLI should be installed for
  validation and formatting of the output.
---

# Satsuma from dbt Project

Reverse-engineer a Satsuma mapping specification from an existing dbt project by
reading its sources, models, schema YAML, and tests.

## Prerequisites

- The user must provide a path to a dbt project (must contain `dbt_project.yml`).
- The `satsuma` CLI should be available for `fmt` and `validate` on the output.

## Step 0: Understand the project layout

Before asking the user anything, scan the project to understand what you're working with:

```bash
# Confirm it's a dbt project
cat <project_path>/dbt_project.yml

# Find all model SQL files
find <project_path>/models -name '*.sql' | head -40

# Find all schema/source YAML files
find <project_path> -name '*.yml' -o -name '*.yaml' | grep -v node_modules | head -20

# Find custom tests
find <project_path>/tests -name '*.sql' 2>/dev/null | head -20

# Find macros
find <project_path>/macros -name '*.sql' 2>/dev/null | head -20
```

## Step 1: Ask the user what they need

After scanning, present what you found and ask:

1. **Scope** — "I found N models across these directories: [list]. Should I convert
   all of them, or focus on a specific folder/tag/subset?" Large projects benefit
   from doing one domain at a time.

2. **Namespace strategy** — "Your models are organized into [staging/intermediate/marts]
   folders. Should each folder become a Satsuma namespace, or do you prefer a flat
   structure?" Default recommendation: one namespace per dbt model directory layer
   (e.g., `staging`, `marts`).

3. **SQL translation depth** — "For SQL transformations in your models, should I:
   (a) translate simple SQL to Satsuma pipe syntax where possible, or
   (b) capture all transform logic as natural-language descriptions?"
   Default recommendation: (a) for simple cases, (b) for complex SQL. This is what
   you should do regardless — the question helps set user expectations.

Do NOT ask about tests — infer metadata from them silently (see Step 3).

## Step 2: Extract source schemas

Read every `sources.yml` / `schema.yml` that defines sources.

For each source table, create a `schema` block:

```
schema <source_name> (
  note "<description from yml>",
  <any meta tags>
) {
  <columns with types and metadata>
}
```

**Inferring metadata from source definitions:**

| dbt YAML | Satsuma metadata |
|---|---|
| `description:` on column | `(note "...")` |
| `meta: {pii: true}` | `(pii)` |
| `meta: {classification: "..."}` | `(classification "...")` |
| `meta: {owner: "..."}` | `(owner "...")` |
| Any other `meta:` key | Carry it as-is — Satsuma metadata is extensible |
| Column not in YAML but in SQL | Add with type `STRING` and `//? type not documented` |

## Step 3: Infer metadata from dbt tests

This is where dbt tests become a rich source of Satsuma metadata. Read the `tests:`
section of every schema YAML column and translate:

| dbt test | Satsuma metadata |
|---|---|
| `not_null` | `(required)` |
| `unique` | `(unique)` |
| `not_null` + `unique` together | `(pk)` — this is a primary key signal |
| `accepted_values: {values: [a, b, c]}` | `(enum {a, b, c})` |
| `relationships: {to: ref('x'), field: 'y'}` | `(ref x.y)` |

For **custom singular tests** (SQL files in `tests/`), read each one:
- If it tests a specific column constraint, add a `(note "tested: <description>")`.
- If it encodes a business rule (e.g., "order total must equal sum of line items"),
  add a `//!` warning or `note {}` block on the relevant mapping.

Custom generic tests (macros like `test_positive_value`) should be noted as metadata
too — e.g., `(note "tested: must be positive")`.

## Step 3b: Detect data modelling patterns and infer structural metadata

Scan model names, folder structure, and SQL patterns to detect modelling conventions.
Apply the appropriate Satsuma metadata tokens — see `references/modelling-conventions.md`
for the full token dictionaries.

**Kimball detection signals:**
- Model names starting with `dim_` → `(dimension)` schema
- Model names starting with `fact_` → `(fact)` schema
- `dbt_utils.generate_surrogate_key()` → signals a surrogate key, likely `(scd 2)`
- `dbt_utils.star()` or many dimension refs in a fact model → `(ref dim_x.field)` tokens
- Snapshot models (dbt snapshots) → `(scd 2)` with `(natural_key ...)` and `(track {...})`
- Grain: unique key config or unique tests on composite keys → `(grain {f1, f2})`

**Data Vault detection signals:**
- Model names starting with `hub_` → `(hub, business_key field)`
- Model names starting with `sat_` → `(satellite, parent hub_x)`
- Model names starting with `link_` → `(link, link_hubs {hub_a, hub_b})`
- `dbt_vault` or `dbtvault` package macros (e.g., `dbt_vault.hub`, `dbt_vault.sat`)
  → strong signal; extract business keys and parent refs from macro arguments

**Merge strategy detection:**
- `materialized='incremental'` + `unique_key` → `(merge upsert, match_on <unique_key>)`
- `materialized='incremental'` + `is_incremental()` with `DELETE` → `(merge soft_delete, ...)`
- `materialized='incremental'` without `unique_key` → `(merge append)`
- `materialized='table'` → `(merge full_refresh)`
- `materialized='view'` → no merge token (views are not persisted)
- dbt snapshots → `(merge upsert, match_on <unique_key>)` with `(scd 2)`

**Report / model consumer detection:**
- dbt exposures in YAML → `(report, source {...}, tool <type>)` or `(model, source {...})`
- Models tagged `exposure`, `dashboard`, `report` in meta → consumer schemas
- Models with no downstream refs (leaf nodes) in a `marts/` directory → candidate consumers

**Governance detection from dbt meta:**
- `meta: {pii: true}` → `(pii)`
- `meta: {classification: "..."}` → `(classification "...")`
- `meta: {owner: "..."}` → `(owner "...")`
- `meta: {retention: "..."}` → `(retention "...")`
- Tags like `pii`, `sensitive`, `restricted` on models → apply as schema-level metadata

## Step 4: Build model schemas and mappings

For each dbt model SQL file:

### a) Parse the SQL for refs and sources

```bash
# Extract ref() and source() calls
grep -oP "ref\('([^']+)'\)" <model>.sql
grep -oP "source\('([^']+)',\s*'([^']+)'\)" <model>.sql
```

Every `{{ source('x', 'y') }}` → a source schema reference.
Every `{{ ref('model_name') }}` → a reference to another model's schema.

### b) Create the target schema

The model itself defines a target schema. Columns come from:
1. The `schema.yml` entry for this model (preferred — has descriptions, tests).
2. The `SELECT` clause of the SQL (fallback — parse column aliases).

Apply the same test-to-metadata inference from Step 3.

### c) Create the mapping

```
mapping `<model_name>` {
  source { <source schemas and ref'd models> }
  target { <this model's schema> }

  <arrows derived from SQL>
}
```

**SQL to arrow translation rules** (see `references/sql-to-satsuma.md` for full
patterns):

| SQL pattern | Satsuma arrow |
|---|---|
| `SELECT a AS b FROM src` | `a -> b` |
| `SELECT TRIM(LOWER(email)) AS email` | `email -> email { trim \| lowercase }` |
| `COALESCE(x, 0) AS x` | `x -> x { coalesce(0) }` |
| `CASE WHEN type = 'R' THEN 'retail' ...` | `type -> type_name { map { R: "retail", ... } }` |
| `UUID_V5(ns, id)` | `id -> new_id { uuid_v5("ns", id) }` |
| Complex CTE chains, window functions, multi-join logic | `-> target_field { "NL description of what the SQL does" }` |
| `CURRENT_TIMESTAMP AS ingest_ts` | `-> ingest_ts { now_utc }` |

When the SQL is too complex for a direct pipe translation, write a clear NL
description using `@ref` for every referenced field. Be honest — don't try to
force complex SQL into pipe syntax. The NL description is a valid and idiomatic
Satsuma approach.

### d) Handle joins

Multi-source models (JOINs) should be expressed in the source block:

```
source {
  stg_orders
  stg_customers
  "Join @stg_orders to @stg_customers on @stg_orders.customer_id = @stg_customers.customer_id"
}
```

Preserve the join type (LEFT, INNER, etc.) in the NL description — it matters for
understanding data completeness.

### e) Handle incremental models

If a model uses `{{ config(materialized='incremental') }}` with an
`is_incremental()` block, add a note:

```
mapping `model_name` (materialized incremental, unique_key "id") {
  note { "Incremental — only new/updated rows processed on each run" }
  ...
}
```

The `materialized` and `unique_key` are custom metadata tokens — Satsuma's
extensible metadata handles this naturally.

## Step 5: Add warnings and questions

After generating all schemas and mappings:

- Add `//!` on any column that exists in SQL but has no YAML documentation.
- Add `//?` on any complex SQL transform you had to describe in NL — flag it as
  "verify this NL description matches the SQL intent."
- Add `//!` if a model has no tests at all — "no dbt tests defined for this model."

## Step 6: Assemble, format, and validate

Decide on file organization based on scope:

- **Small project (< 10 models):** Single `.stm` file.
- **Medium project (10–30 models):** One file per dbt model directory, with imports.
- **Large project (30+ models):** One file per domain/namespace, with imports. Use
  the same grouping the dbt project already uses.

```bash
# Format
satsuma fmt <output>.stm

# Validate
satsuma validate <output>.stm

# Check for lint issues
satsuma lint <output>.stm
```

Fix any validation errors before presenting the output.

## Step 7: Present and explain

Use the satsuma-explainer skill (if available) to walk the user through the
generated spec. If not available, provide a brief summary of what was generated:
schemas, mappings, any warnings or open questions, and PII-tagged fields.

Explicitly tell the user:
- Which transforms were translated to pipe syntax vs. NL descriptions.
- Which metadata was inferred from tests vs. YAML vs. SQL.
- Any fields or models that need manual review.
