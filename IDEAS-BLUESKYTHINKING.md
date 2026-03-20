# Satsuma Blue-Sky Thinking

Explorations of how ideas from `ideas.MD` might look in extended Satsuma syntax.

**Design principles throughout:**
- Stay declarative and BA-friendly -- describe *what*, not *how*
- Lean on existing constructs — `(metadata)` tokens, bare `"NL strings"` in `{ }`,
  `note { }` blocks, and vocabulary conventions — before inventing new keywords
- An LLM-based interpreter should be able to read these and do the right thing
- Where something doesn't belong in the language, say so explicitly


---

## 1. External Schema Import (DBML, Protobuf, Avro, JSON Schema ...)

The grammar doesn't need to understand every schema language. We just need a
clean way to say "this structure is defined over there, bring it in."

```stm
// Pull in a DBML file -- the tooling resolves it to Satsuma-equivalent fields
schema crm_database (from dbml "schemas/crm.dbml", table "customers") {}

// Same idea for Avro, Protobuf, JSON Schema
schema events (from avro "schemas/clickstream.avsc") {}
schema warehouse (from protobuf "protos/warehouse.proto", message "OrderRow") {}
schema api_payload (from json-schema "schemas/order-response.json") {}

// You can still override or annotate individual fields after import
schema crm_database (from dbml "schemas/crm.dbml", table "customers") {
  email  STRING  (pii)              // add metadata the DBML didn't have
  phone  STRING  (pii, format E.164)
}
```

**Why metadata tokens and not a grammar extension:** The DBML/Avro/etc. parsers live
in external tooling. Satsuma just needs to say "resolve this" and then the AST looks
identical to a hand-written schema block. An LLM interpreter can read the
referenced file and inline the fields.


---

## 2. ~~Lineage Tracing~~ ✅ Implemented

> **Implemented in Features 09/10.** `satsuma lineage --from <schema> [--to <schema>]` walks the AST and emits a DAG. `satsuma arrows <schema.field>` provides field-level edge extraction. The core tooling concern is solved.
>
> **Remaining blue-sky:** Cross-integration lineage metadata (`lineage upstream "..."`) for tracing across workspace boundaries where a single Satsuma workspace doesn't contain the full picture. This would be a metadata convention, not a grammar change.


---

## 3. Reusable Transform Fragments with Parameters

Fragments exist for field groups. Named transforms exist for reusable pipelines.
Extend the concept to support parameters -- like macros, but declarative.

```stm
// Declare a reusable transform chain with parameters
transform 'clean phone'(country_field) {
  trim
  | "Extract digits. If 10 digits and {country_field} is US/CA,
     prepend +1. Format as E.164. Null if unparseable."
}

transform 'to cents' {
  coalesce(0) | * 100 | round
}

transform 'scd hash'(*fields) {
  "Compute SHA-256 over the concatenation of {fields},
   used for change detection in SCD Type 2 loads."
}

// Use them in mappings
mapping {
  source { `legacy` }
  target { `target` }

  PHONE_NBR -> phone           { ...clean phone(COUNTRY_CD) }
  CREDIT_LIMIT -> credit_cents { ...to cents }
  -> row_hash                  { ...scd hash(first_name, last_name, email, phone) }
}
```

The parameter syntax `{country_field}` inside NL strings is intentionally loose --
the LLM interpreter interpolates it. No template engine needed.


---

## 4. ~~Dimensional Modelling Extensions~~ ✅ Implemented

> **Implemented in Feature 06.** Kimball conventions (`dimension`, `fact`, `natural_key`, `scd type N`, `grain`, `measure`, `ref ... on`, `conformed`) are defined with canonical examples at `docs/data-modelling/kimball/`. All conventions use existing `( )` metadata — no grammar changes were needed.
>
> **Remaining blue-sky:** DDL/dbt generation tooling from convention-annotated schemas (Feature 06 Phase 3, tracked in FUTURE-WORK.md).


---

## 5. ~~Data Vault Extensions~~ ✅ Implemented

> **Implemented in Feature 06.** Data Vault 2.0 conventions (`hub`, `link`, `satellite`, `effectivity`, `business_key`, `parent`, `source_system`) are defined with canonical examples at `docs/data-modelling/datavault/`. Hub/link/satellite/effectivity patterns all use existing `( )` metadata with inferred mechanical columns.
>
> **Remaining blue-sky:** DDL/dbt generation tooling from convention-annotated schemas (Feature 06 Phase 3, tracked in FUTURE-WORK.md).


---

## 6. ~~SCD / Historisation Patterns~~ ✅ Implemented

> **Implemented in Feature 06.** SCD Type 1, 2, and 6 patterns are covered by the Kimball and Data Vault conventions with `scd type N`, `natural_key`, `track {...}`, and `ignore {...}` metadata tokens. See `docs/data-modelling/kimball/` for canonical examples.


---

## 7. Merge / Upsert Strategy

How data should land in the target is a declaration of intent, not implementation.

```stm
// On the mapping block itself:
mapping 'crm extract' (merge upsert, match_on customer_id, on_match update, on_no_match insert) {
  source { `crm_extract` }
  target { `customer_master` }

  customer_id -> customer_id
  email -> email
  phone -> phone
}

// Append-only (event log pattern)
mapping 'clickstream ingest' (merge append) {
  source { `clickstream` }
  target { `event_log` }

  // No match logic needed -- every record is a new row
  event_id -> event_id
  timestamp -> event_time
  payload -> event_data
}

// Soft-delete pattern
mapping 'crm deletes' (merge soft_delete, match_on customer_id, delete_flag is_deleted, delete_timestamp deleted_at) {
  source { `crm_deletes` }
  target { `customer_master` }

  customer_id -> customer_id
}

// Full refresh with safety rail
mapping 'daily export' (merge full_refresh) {
  source { `daily_export` }
  target { `reporting_snapshot` }

  note {
    "Truncate-and-reload. Acceptable because this table is a daily snapshot
     and downstream consumers expect exactly one day's data."
  }
  // ... field mappings ...
}
```

The `merge` token plus `match_on`, `on_match`, `on_no_match` in `( )` metadata
is enough for an interpreter to generate the right MERGE/INSERT/UPDATE/DELETE
pattern for the target platform. A BA reads it and understands: "new customers
get inserted, existing ones get updated."


---

## 8. Governance Tags (Flexible, User-Extensible)

The existing `(pii)` and `(encrypt)` metadata tokens already point the way.
Extend this to a general-purpose token system where governance metadata rides
on top of the core syntax.

```stm
// Built-in governance tokens (standard library)
schema customer_360 {
  customer_id    UUID          (pk)
  full_name      VARCHAR(200)  (pii, classification confidential)
  email          VARCHAR(255)  (pii, classification confidential, mask partial_email)
  phone          VARCHAR(20)   (pii, mask last_four)
  ssn_encrypted  TEXT          (pii, classification restricted, encrypt AES-256-GCM)
  loyalty_tier   VARCHAR(20)   (classification internal)
  signup_date    DATE          (classification public)
}

// Governance at the schema level — all in ( ) metadata
schema customer_360 (
  owner "data-platform-team",
  steward "jane.doe@company.com",
  retention years 7 after last_activity_date,
  compliance {GDPR, CCPA, HIPAA}
) {
  // ... fields ...
}

// Custom / org-specific tokens -- no grammar change needed
schema finance_ledger (
  owner "finance-data-eng",
  sox_control ref "SOX-1042" review_cycle quarterly,
  cost_center "CC-4200"
) {
  // ... fields ...
}
```

**Why this works without grammar changes:** Vocabulary tokens in `( )` metadata
are already in the grammar. Governance is just convention on top of it. An org
publishes a "token dictionary" (itself possibly an Satsuma file or YAML), and linting
tooling validates that required tokens are present. The language stays clean;
governance policy lives in config.

```stm
// Possible: a governance policy file (this might be YAML, not Satsuma -- TBD)
// Included here just to show the idea
governance_policy "ACME Corp Data Standards" {
  require owner on all schemas
  require classification on all pii fields
  require retention on schemas with compliance GDPR
  warn_if_missing steward on schemas
}
```

> **Verdict:** The `( )` metadata tokens are already the right mechanism.
> Governance is a *convention layer*, not a language extension. A standard token
> library + linter rules = full governance without touching the grammar.


---

## 9. ~~Metrics / KPI Declarations~~ ✅ Implemented

> **Implemented in Features 08/09.** `metric` is a first-class keyword in the grammar and parser. The CLI provides `satsuma metric <name>` for extraction, and metrics participate in `satsuma summary`, `satsuma lineage`, `satsuma where-used`, and `satsuma validate`. Canonical examples at `examples/metrics.stm`.


---

## 10. Reports and ML Models as Targets

These are *consumers* of the data pipeline. They don't need field-level schemas
-- they need intent descriptions so that lineage tooling knows what depends on
what, and so that a BA can see the full picture in one place.

```stm
// A report: mostly natural language, with explicit dependencies
report weekly_sales_dashboard "Executive Weekly Sales" (
  source {fact_orders, dim_customer, dim_product, dim_date},
  owner "bi-team",
  refresh schedule "Monday 06:00 UTC",
  tool looker dashboard_id "sales-weekly-exec"
) {
  note {
    """
    # Weekly Sales Dashboard

    Executive-facing dashboard showing:
    - Revenue by region (bar chart, MTD vs prior month)
    - Top 10 products by units sold
    - New customer acquisition funnel
    - Pipeline coverage ratio (3x target)

    **Filters:** Region, Product Line, Sales Rep
    **Audience:** VP Sales and above
    """
  }
}

// An ML model: declare inputs, outputs, and purpose
model churn_predictor "Customer Churn Prediction v3" (
  source {dim_customer, fact_orders, fact_support_tickets},
  owner "ml-engineering",
  refresh schedule "daily",
  registry mlflow experiment "churn-v3"
) {
  record features {
    note {
      """
      - days_since_last_order (from fact_orders)
      - support_ticket_count_30d (from fact_support_tickets)
      - lifetime_order_value (from fact_orders)
      - customer_tenure_months (from dim_customer)
      - product_category_diversity (from fact_orders + dim_product)
      """
    }
  }

  record output {
    churn_probability  DECIMAL(5,4)
    churn_risk_tier    VARCHAR(10)  (enum {low, medium, high})
  }

  note {
    "XGBoost classifier. Retrained daily on 24-month rolling window.
     Threshold: >= 0.7 = high risk, triggers retention campaign."
  }
}
```

> **Are `report` and `model` new keywords or just `schema` with tokens?**
> Could go either way. As a new keyword they read more naturally. As
> `schema weekly_sales (report) { ... }` they avoid grammar changes. Leaning
> toward new keywords because these are semantically *not* schemas (you don't
> map fields into them the same way) and clarity for BAs matters more than
> grammar minimalism here.

> **BUT:** if the cost of new keywords feels too high, this works fine:
> ```stm
> schema weekly_sales_dashboard (report, tool looker) {
>   note { "..." }
> }
> ```
> The `report` token alone is enough for tooling to treat it differently.


---

## 11. jsonPath / xmlPath for Field References

The `xpath` metadata token already exists. Extend the pattern to JSON sources.

```stm
schema api_response (format json) {
  order_id     STRING    (jsonpath "$.order.id")
  customer     STRING    (jsonpath "$.order.customer.email")
  list items (jsonpath "$.order.line_items[*]") {
    sku        STRING    (jsonpath "$.sku")
    qty        INTEGER   (jsonpath "$.quantity")
  }
  total        DECIMAL   (jsonpath "$.order.totals.grand_total")
  metadata     JSON      (jsonpath "$.order.metadata")  // grab a whole subtree
}
```

This is straightforward -- `jsonpath` parallels `xpath` as a metadata token.
Tooling resolves the paths at parse time. No controversy here.


---

## 12. Things That Are NOT for This Language

Some ideas from the list are better served by tooling, documentation, or
comments rather than language extensions:

### Language Server (idea #3)
Purely a tooling concern. The tree-sitter grammar already provides the
foundation. A language server reads the AST -- no syntax changes needed.
**PRD written (Feature 16), not yet started.**

### ~~Satsuma Linter (idea #4)~~ ✅ Implemented
`satsuma lint` shipped in Feature 17 with 3 rules, `--fix` support, and JSON/text output.

### Incremental Tutorial (idea #7)
Documentation, not syntax. Though the examples in this file could *be* that
tutorial progression.

### Type Changes as Transforms (idea #6)
This is already implicit in the mapping syntax:
```stm
// The type change IS the transform -- no extra syntax needed
CREATED_DATE -> created_at { parse("MM/DD/YYYY") | to_utc }
// VARCHAR(10) -> TIMESTAMPTZ is implied by the transform chain
```
An LLM interpreter already reasons about type changes from the source/target
field types and the transform chain. Making it more explicit would add noise
without helping BAs or engineers.


---

## Design Notes

### On Natural Language as the Escape Hatch
Bare `"..."` strings inside `{ }` are Satsuma's superpower. For anything too complex
or domain-specific to express in a piped transform chain, you write intent in
English and let the interpreter figure it out. This means the language can stay
small while handling arbitrarily complex logic.

Every idea above uses NL strings as a pressure valve: if the metadata-based
approach can't express something cleanly, drop to natural language rather than
inventing syntax.

### On Vocabulary Tokens as the Extension Mechanism
Almost every "extension" above is really just a new vocabulary token in `( )`
metadata. The grammar already supports arbitrary tokens in metadata blocks.
This means:
- No grammar changes for dimensional modelling, data vault, governance, SCD, merge strategy
- New semantics come from *convention* (token dictionaries) and *tooling* (linters, interpreters)
- The language itself stays stable while the ecosystem grows

### On New Keywords
Only `metric`, `report`, and `model` are proposed as possible new keywords, and
even those could be `schema` blocks with metadata tokens. The bar for a new
keyword should be: "Is this concept so fundamentally different from
schema/fragment/mapping that using an existing keyword would confuse a BA reading
the file?"

### On Keeping It BA-Friendly
A BA should be able to read any Satsuma file and understand:
1. Where data comes from (schemas used as sources)
2. Where it goes (schemas used as targets)
3. What happens to it along the way (mappings with NL descriptions)
4. What business rules apply (notes, metadata tokens)

Everything in this document should pass that test. If a token like
`scd type 2 track {email, phone}` is too technical, the `note { }` block
next to it should explain it in plain English.
