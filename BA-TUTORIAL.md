# STM for Business Analysts — A Practical Tutorial

## What Is STM and Why Should You Care?

If you've ever worked on a data migration, system integration, or ETL project, you already know the pain of **source-to-target mapping documents**. They're almost always Excel spreadsheets — columns for Source Field, Target Field, Transformation, Data Type, Comments — and they're almost always a mess.

Every team invents its own layout. Transformation logic lives in free-text cells like *"Convert to uppercase and validate"* (but what does "validate" mean, exactly?). Files get emailed, copied to SharePoint, and edited by three people at once. Which version is current? Nobody's entirely sure. And when an issue crops up in production six months later, nobody can trace the ambiguous spreadsheet cell back to a conscious decision.

**STM** — Structured Transform Markup — is a simple, readable language designed to replace those spreadsheets. It's a plain-text format that you can version in Git, review in pull requests, and — crucially — read without needing a decoder ring.

Think of STM as sitting between the business requirements and the implementation code. It captures **what** the data transformation should do — precisely enough that an engineer (or an AI agent) can implement it, yet readably enough that a BA can review and sign it off.

Here's the headline: **if you can read a column list in a database tool, you can read STM**. This tutorial will walk you through the syntax step by step, starting from the simplest possible mapping and building up to real-world complexity.

---

## Your First Mapping: Two Fields, One Line

Let's start with the smallest useful STM file. Imagine you're migrating customer records from an old system to a new one, and right now you only care about mapping the customer identifier.

```stm
schema old_system {
  CUST_ID   INT
}

schema new_system {
  customer_id   UUID
}

mapping {
  source { `old_system` }
  target { `new_system` }

  CUST_ID -> customer_id
}
```

Three types of block, and you can already see the entire story:

1. **`schema`** — describes the structure of a data source or target. Every system, whether a database table, JSON API, XML message, or flat file, uses this same keyword.
2. **`mapping`** — ties schemas together. Its `source { }` and `target { }` sub-blocks identify which schemas are being mapped, using backtick references. Arrow declarations follow.
3. **`->`** — the heart of STM. Read it as *"maps to"* or *"becomes"*.

The backtick references (`` `old_system` ``, `` `new_system` ``) inside the mapping block point to the schemas defined above.

That's it. You've just read your first STM file.

---

## Adding Data Types and Metadata

Fields in a schema block follow a consistent pattern:

```stm
field_name    DATA_TYPE    (metadata)
```

Metadata appears in **parentheses** `( )` and captures the details you'd normally scatter across several Excel columns — whether a field is a primary key, whether it's required, what values are allowed, and so on:

```stm
schema old_system {
  CUST_ID       INT            (pk)
  CUST_TYPE     CHAR(1)        (enum {R, B, G})
  EMAIL_ADDR    VARCHAR(255)   (pii)
  CREDIT_LIMIT  DECIMAL(12,2)  (default 0)
}

schema new_system {
  customer_id     UUID           (pk, required)
  customer_type   VARCHAR(20)    (enum {retail, business, government}, required)
  email           VARCHAR(255)   (format email, pii)
  credit_limit    BIGINT         (default 0)
}
```

Some of the metadata tokens you'll encounter most often:

| Token | What It Means |
| ----- | ------------- |
| `pk` | Primary key |
| `required` | Must not be null or empty |
| `pii` | Personally identifiable information — flag for governance |
| `encrypt` | Must be encrypted (optionally specifying algorithm, e.g. `encrypt AES-256-GCM`) |
| `enum {a, b, c}` | Only these values are allowed |
| `default val` | Default value if the source is null |
| `format email` | Expected format (email, E.164, UUID, etc.) |
| `ref table.field` | Foreign key reference to another schema |

Notice that **data types are freeform** — STM doesn't enforce a type system. You write whatever matches the real system: `VARCHAR(200)`, `STRING(200)`, `DECIMAL(12,2)`, `TIMESTAMPTZ`. The goal is to describe what actually exists, not to conform to an abstract type model.

---

## Transforms: Where the Logic Lives

A bare arrow (`->`) is fine for direct copies, but most real mappings require some transformation. In STM, you add transforms in `{ }` after the arrow:

```stm
mapping {
  source { `old_system` }
  target { `new_system` }

  CUST_ID -> customer_id

  EMAIL_ADDR -> email { trim | lowercase | validate_email }

  CREDIT_LIMIT -> credit_limit { coalesce(0) | * 100 | round }
}
```

The pipe character (`|`) chains transforms left to right, exactly like a Unix pipeline. Reading the email mapping aloud: *"Take `EMAIL_ADDR`, trim leading and trailing whitespace, convert to lowercase, then validate it as an email address."*

The credit limit mapping: *"Take `CREDIT_LIMIT`, replace null with zero, multiply by 100 (converting to cents), then round."*

This is one of STM's big wins over spreadsheets. Instead of a free-text cell saying *"Clean up and convert to cents"*, you get a precise, ordered sequence of operations that an engineer can implement directly.

### Value Maps

When a source field uses codes that need translating to human-readable values, use a `map { }` block:

```stm
CUST_TYPE -> customer_type {
  map {
    R: "retail"
    B: "business"
    G: "government"
    null: "retail"
  }
}
```

This replaces the classic Excel approach of listing value mappings in a separate tab or a comments column. Everything stays together. The special key `null` handles missing values; `default` or `_` acts as a wildcard fallback for anything not explicitly listed.

### Range-Based Maps

For tier assignments and other range conditions, the `map { }` block supports comparison operators:

```stm
LOYALTY_POINTS -> loyalty_tier {
  map {
    < 1000:  "bronze"
    < 5000:  "silver"
    < 10000: "gold"
    default: "platinum"
  }
}
```

Read it just as you'd read a business rule: *"If loyalty points are below 1,000, assign 'bronze'; below 5,000, 'silver'; below 10,000, 'gold'; otherwise 'platinum'."*

### Computed Fields

Not every target field has a direct source. Some are calculated from multiple inputs, some are constants. Omit the left side of the arrow to signal a **computed field**:

```stm
-> display_name {
  "If CUST_TYPE is null or 'R', trim and concat FIRST_NM + ' ' + LAST_NM.
   Otherwise, trim COMPANY_NM."
}

-> migration_timestamp { now_utc() }
```

The quoted string is a natural-language transform — more on those in a moment. `now_utc()` is a function call with no source input.

### Fallback Sources

When a preferred source field might be null, describe the fallback within the transform pipeline:

```stm
LAST_MOD_DATE -> updated_at {
  parse("MM/DD/YYYY hh:mm:ss a") | to_utc
  | "If null, fall back to CREATED_DATE parsed as MM/DD/YYYY in UTC"
}
```

*"Try to parse `LAST_MOD_DATE`. If it's null, fall back to `CREATED_DATE` instead."* This replaces the "if blank, use column X" note you'd normally bury in a comment.

---

## Comments That Actually Mean Something

STM has three kinds of comment, each carrying a different signal:

```stm
// A normal informational comment
//! A warning — a known risk, issue, or data-quality problem
//? A question or TODO — something that still needs resolving
```

The `//!` and `//?` variants aren't just cosmetic. Tooling can scan for them automatically and surface a count of unresolved questions or known risks — perfect for a BA tracking open items before sign-off.

```stm
EMAIL_ADDR    VARCHAR(255)   (pii)           //! Not validated — contains garbage
CREATED_DATE  VARCHAR(10)                    //! Stored as MM/DD/YYYY string
STATE_PROV    VARCHAR(50)                    //? Should we normalise to 2-char codes?
```

---

## Notes: Rich Documentation In-Line

For longer explanations — context a developer or reviewer needs, data-quality background, open issues — STM provides two ways to attach notes.

**On schemas and fields**, notes are metadata, so they go in `( )`. Use `"..."` for a short note, or `"""..."""` when you need Markdown headings, bullet points, or multiple paragraphs:

```stm
schema legacy_customers (note "Primary customer store from 2005–2024.") {
  PHONE_NBR  VARCHAR(50) (
    note """
    No consistent format across the dataset:
    - **42%** `(555) 123-4567` — US with parentheses
    - **31%** `555.123.4567` — dot-separated
    - **15%** `+15551234567` — already E.164
    - **8%** `5551234567` — raw 10-digit
    - **4%** other (international, extensions, garbage)
    """
  )
}
```

**At file level or inside mapping blocks**, use a standalone `note { }` block:

```stm
note {
  """
  # Legacy Customer Migration

  Part of **Project Phoenix** — decommissioning the legacy SQL Server 2008
  instance by Q2 2026. Migrates customer records to a normalized PostgreSQL
  schema with proper typing, encryption, and referential integrity.

  ## Constraints
  - Runs in **batches of 10,000** to prevent memory issues
  - Target enforces referential integrity — addresses created *before* customers
  - Estimated total: **2.4M records**, ~180 batches
  """
}
```

A `note { }` at the top of the file documents the whole integration. One inside a `mapping { }` block documents that specific mapping's assumptions. Because notes travel with the specification, they don't drift out of date the way a Confluence page does.

---

## Natural Language Transforms: Bridging the Gap

Sometimes a transformation is too complex or context-dependent to express as a neat chain of functions. In STM, a quoted string directly inside `{ }` is a **natural-language transform**:

```stm
PHONE_NBR -> phone {
  "Extract all digits. If 11 digits starting with 1, treat as US.
   If 10 digits, assume US country code +1. Format as E.164.
   For other patterns, attempt to determine country from COUNTRY_CD.
   If unparseable, set null and log warning with original value."
}
```

This says to both the engineer and any AI tooling: *"This needs custom implementation — here's the intent."* It's an honest acknowledgement that not every business rule can be reduced to a neat function call — but it still belongs *in the spec*, not in someone's head or lost in a meeting note.

Natural language mixes seamlessly with parseable pipeline steps:

```stm
NOTES -> notes {
  "Filter profanity using corporate word list v3.2, replacing matches with asterisks"
  | escape_html
  | truncate(5000)
}
```

This is enormously valuable for BAs. You can describe complex business logic in plain English *within the mapping spec itself*, sitting right next to the parseable transforms. No more hunting through email threads or Jira comments for the "real" requirements.

---

## Nested Structures: `record` and `list`

Real data is rarely flat. STM handles nested structures with two keywords:

- **`record`** — a single nested object (one instance per parent record)
- **`list`** — a repeated nested object (zero or more instances per parent record)

```stm
schema order {
  order_id   STRING (pk)
  record customer {
    id     STRING
    email  STRING (pii)
  }
  list line_items {
    sku         STRING (required)
    quantity    INT
    unit_price  DECIMAL(12,2)
  }
}
```

Both keywords can be nested to any depth. In mapping arrows, `[]` signals array access and a `.` prefix means "relative to the current nesting context":

```stm
LineItems[] -> .items[] {
  .ITEMNO -> .item { trim }
  .QUANTITY -> .unitQuantity { "Divide by 10000 for 4 implied decimal places" }
}
```

### Flatten: Exploding Arrays into Rows

A common ETL pattern is taking a single source record with an array and producing one output row per array element. STM makes this explicit with a `flatten` annotation on the mapping:

```stm
mapping 'order lines' (flatten `Order.LineItems[]`) {
  source { `commerce_order` }
  target { `order_lines_parquet` }

  Order.OrderId -> order_id
  Order.LineItems[].SKU -> sku { trim | uppercase }
  Order.LineItems[].Quantity -> quantity
}
```

The `flatten` option on the mapping header tells the reader: *"For each element in `LineItems[]`, emit one target row. Parent-level fields like `OrderId` are repeated."*

This is one of those patterns that's notoriously difficult to express in a spreadsheet. You'd typically need a separate tab or a paragraph of explanation. In STM, it's a single option on the mapping header and the array path references make the grain of the target table completely unambiguous.

---

## Multiple Sources and Joins

Enterprise integrations rarely involve just one source. When a mapping draws from multiple schemas, list them all in the `source { }` block and describe the join in natural language:

```stm
mapping 'opportunity enrichment' {
  source {
    `sfdc_opportunity`
    `sfdc_account`
    "Join on sfdc_opportunity.AccountId = sfdc_account.Id"
  }
  target { `snowflake_opps` }
  // arrow declarations follow...
}
```

---

## Imports and Reuse

In a large programme, the same structures appear again and again — address blocks, audit columns, phone normalisation logic. STM lets you define these once and share them.

### Fragments

A **fragment** is a reusable set of fields:

```stm
// lib/common.stm
fragment 'address fields' {
  street_line_1   VARCHAR(200)
  street_line_2   VARCHAR(200)
  city            VARCHAR(100)
  state_province  VARCHAR(50)
  postal_code     VARCHAR(20)
  country_code    CHAR(2)
}
```

Pull it into a schema using the spread operator (`...`):

```stm
import { 'address fields' } from "lib/common.stm"

schema customers {
  customer_id    UUID          (pk)
  display_name   VARCHAR(200)  (required)
  ...address fields
}
```

The fields from `'address fields'` are inlined as if you'd typed them directly. When the address structure changes, you update it in one place.

### Named Transforms

A **named transform** is a reusable pipeline or natural-language step:

```stm
transform 'clean email' {
  "Trim whitespace, lowercase, validate RFC 5322 format, return null if invalid"
}

transform 'to utc date' {
  parse("MM/DD/YYYY") | assume_utc | to_iso8601
}
```

Spread them into mapping pipelines with `...`:

```stm
EMAIL_ADDR   -> email      { ...clean email }
CREATED_DATE -> created_at { ...to utc date }
```

### Imports

The `import` statement brings fragments, transforms, or schemas from other files into scope:

```stm
import { 'address fields', 'audit fields' } from "lib/common.stm"
import { 'currency rates' } from "lookups/finance.stm"
```

This supports splitting large specifications across multiple files — one per source system, perhaps, or one per domain — while keeping each individual file focused and readable.

---

## Format-Specific Metadata

When working with XML, EDI, CSV, or other structured formats, extraction hints go in `( )` — the same parentheses used for all other metadata. There's no separate annotation syntax to learn.

```stm
schema commerce_order (
  format xml,
  namespace ord "http://example.com/commerce/order/v2",
  namespace com "http://example.com/common/v1"
) {
  record Order (xpath "/ord:OrderMessage/ord:Order") {
    OrderId   STRING  (xpath "ord:OrderId")
    Channel   STRING  (xpath "ord:Channel")
  }
}
```

For fixed-length EDI, use `filter` in `( )` to restrict a list to matching elements:

```stm
list POReferences (filter REFQUAL == "ON") {
  REFQUAL   CHAR(3)
  REFNUM    CHAR(35)   // PO Number + "/" + Dissection No
}
```

You don't need to understand every format detail — the important thing is that extraction logic stays *inside the mapping spec* rather than buried in implementation code.

---

## Putting It All Together

Here's a realistic Salesforce-to-Snowflake integration, the kind of mapping you might review as a BA on a revenue operations project:

```stm
// STM — Salesforce to Snowflake Pipeline

import { 'sfdc standard types' } from "lib/sfdc_fragments.stm"
import { 'currency rates' } from "lookups/finance.stm"

note {
  """
  # Salesforce to Snowflake Pipeline

  Maps Sales Cloud `Opportunity` and `Account` objects into the
  `ANALYTICS.RAW_SFDC` schema.

  ## Sync Strategy
  - **Incremental:** Uses `SystemModStamp` to pull changes every 15 minutes.
  - **Hard Deletes:** Captured via the `isDeleted` flag in SFDC.
  """
}


// --- Sources ---

schema sfdc_opportunity (note "SFDC Opportunity Object") {
  Id                      ID              (pk)
  Name                    STRING(120)     (required)
  AccountId               ID              (ref sfdc_account.Id)
  Amount                  CURRENCY(18,2)
  CurrencyIsoCode         STRING(3)       (default "USD")
  StageName               PICKLIST        (enum {Prospecting, Qualification, "Value Prop", Closed_Won, Closed_Lost})
  CloseDate               DATE            (required)
  `ARR_Override__c`       CURRENCY(18,2)  //! manual override used by Finance
  SystemModStamp          DATETIME        (required)
}

schema sfdc_account (note "SFDC Account Object") {
  Id              ID             (pk)
  Name            STRING(255)    (required)
  BillingCountry  STRING(80)
}


// --- Target ---

schema snowflake_opps (note "FACT_OPPORTUNITIES — Snowflake Analytics") {
  opp_key          VARCHAR(18)   (pk)
  account_key      VARCHAR(18)   (indexed)
  opportunity_name VARCHAR(120)
  amount_raw       NUMBER(18,2)
  amount_usd       NUMBER(18,2)  (note "Converted at daily spot rate")
  arr_value        NUMBER(18,2)  (required)
  pipeline_stage   VARCHAR(50)   (enum {top_funnel, mid_funnel, closed_won, closed_lost})
  is_closed        BOOLEAN
  close_date       DATE
  source_system    VARCHAR(10)   (default "SFDC")
  ingested_at      TIMESTAMP_NTZ
}


// --- Mapping ---

mapping 'opportunity ingestion' {
  source { `sfdc_opportunity` }
  target { `snowflake_opps` }

  // --- Direct identifiers ---
  Id        -> opp_key
  AccountId -> account_key
  Name      -> opportunity_name

  // --- Financial ---
  Amount -> amount_raw { coalesce(0) }

  Amount -> amount_usd {
    "Multiply by rate from `currency rates` lookup using CurrencyIsoCode"
    | round(2)
  }

  `ARR_Override__c` -> arr_value {
    "Use ARR_Override__c if not null, otherwise fall back to Amount"
    | coalesce(0)
  }

  // --- Stage normalization ---
  StageName -> pipeline_stage {
    map {
      Prospecting:  "top_funnel"
      Qualification: "mid_funnel"
      "Value Prop":  "mid_funnel"
      Closed_Won:    "closed_won"
      Closed_Lost:   "closed_lost"
      _:             "unknown"
    }
  }

  -> is_closed {
    "True if StageName is 'Closed_Won' or 'Closed_Lost', false otherwise."
  }

  CloseDate      -> close_date
  SystemModStamp -> ingested_at { to_utc }
}
```

Even if you've never seen STM before today, you can follow this specification and answer questions like:

- *"What happens if Amount is null?"* — The `arr_value` mapping shows `coalesce(0)`, so it becomes zero.
- *"How is pipeline stage determined?"* — There's an explicit value map from Salesforce picklist values to Snowflake categories.
- *"What about currency conversion?"* — The `amount_usd` mapping uses a natural-language description explaining it uses the `currency rates` lookup.
- *"What if Finance has overridden the ARR?"* — `ARR_Override__c` takes priority, with `Amount` as a fallback.

Compare that to hunting through a spreadsheet's comments column, a Confluence page, and a Slack thread to piece together the same answers.

### STM vs the Spreadsheet: A Side-by-Side

To make the contrast concrete, consider how the stage-mapping rule above would look in a typical Excel mapping document:

| Source Field | Target Field | Transformation | Notes |
| ------------ | ------------ | -------------- | ----- |
| StageName | pipeline_stage | Map values (see lookup tab) | Prospecting=top_funnel, Qualification=mid_funnel, etc. |

That single row raises immediate questions. *"What about 'Value Prop' — is that top or mid funnel?"* *"What if the value doesn't match any of these?"* *"Where's the lookup tab — is it in this workbook or another one?"* The STM `map { }` block answers all of these inline, with a `_` wildcard for unrecognised values. There's no lookup tab to lose, no ambiguity to resolve in a follow-up meeting.

---

## Quick Reference: The STM Building Blocks

| Concept | Syntax | Purpose |
| ------- | ------ | ------- |
| Schema | `schema name { ... }` | Describes a system's data structure (source or target) |
| Field | `name TYPE (metadata)` | One data element |
| Nested object | `record name { ... }` | Single nested structure |
| Repeated object | `list name { ... }` | Repeated nested structure |
| Mapping block | `mapping name { source { } target { } ... }` | Defines transformations between schemas |
| Direct mapping | `A -> B` | Source field maps to target field |
| Transform pipeline | `A -> B { trim \| lowercase }` | Mapping with transformation steps |
| Natural language | `A -> B { "description" }` | Complex logic in plain English |
| Computed field | `-> B { expression }` | Target field with no direct source |
| Value map | `{ map { X: "y", _: "default" } }` | Code-to-value translation |
| Range map | `{ map { < 1000: "bronze", default: "gold" } }` | Threshold-based assignment |
| Fallback | `{ pipeline \| "If null, fall back to OTHER_FIELD" }` | Alternative source in NL |
| Note (metadata) | `(note "...")` or `(note """...""")` | Documentation on a field or schema |
| Note (block) | `note { "..." }` | Standalone documentation block |
| Comment | `//` / `//!` / `//?` | Info / warning / open question |
| Fragment | `fragment name { ... }` | Reusable field set |
| Named transform | `transform name { ... }` | Reusable pipeline logic |
| Spread | `...fragment name` | Inline a fragment's fields or transform |
| Import | `import { 'x' } from "file.stm"` | Bring definitions from another file |
| Flatten | `mapping name (flatten \`Array[]\`) { ... }` | Explode array into one row per element |

---

## Next Steps

You don't need to memorise every detail in this tutorial. The key takeaways are:

1. **STM is readable** — if you can read a database column list, you can read STM.
2. **Everything lives in one place** — schema definitions, mapping logic, transformation rules, data-quality warnings, and documentation all sit together in a single versionable file.
3. **Precision replaces ambiguity** — instead of free-text descriptions, transforms are explicit pipelines. Where precision isn't practical, quoted natural-language blocks capture intent rather than leaving it to tribal knowledge.
4. **It scales** — from a two-field proof of concept to a multi-source enterprise data hub, STM uses the same consistent syntax.
5. **It versions naturally** — because STM files are plain text, they slot straight into Git. You get full change history, pull-request reviews, and the ability to diff two versions of a mapping side by side. No more "v7_FINAL_FINAL_reviewed_JK.xlsx".

### A practical review checklist

When you next review a mapping specification, try this approach:

1. **Start with the top-level `note { }` block.** Read it for project context, constraints, and dependencies.
2. **Scan the `//!` warnings.** These are known data-quality risks and issues. Make sure each one has a plan — is it handled in the transform, or is it an open item?
3. **Count the `//?` questions.** These are unresolved items. They should all be resolved before sign-off. If any remain, they're your action items.
4. **Walk the mapping block line by line.** For each mapping, ask: *"Does this transform match the business rule we agreed?"* Pay particular attention to value maps and natural-language strings — these encode your business logic.
5. **Check for computed fields (`-> target_field`).**  These target fields have no direct source, so they're easy to miss. Make sure the derivation logic is correct and complete.
6. **Look at fallback descriptions.** These define what happens when preferred data is missing. Confirm the fallback behaviour matches your requirements.

If everything checks out, you can sign it off with confidence. If something doesn't match, you can point to the exact line and say precisely what needs changing — no more ambiguous feedback on a 200-row spreadsheet.

That's a far cry from arguing over which version of the Excel file has the latest transformation logic.
