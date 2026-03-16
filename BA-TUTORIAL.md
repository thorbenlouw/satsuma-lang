# STM for Business Analysts — A Practical Tutorial

## What Is STM and Why Should You Care?

If you've ever worked on a data migration, system integration, or ETL project, you already know the pain of **source-to-target mapping documents**. They're almost always Excel spreadsheets — columns for Source Field, Target Field, Transformation, Data Type, Comments — and they're almost always a mess.

Every team invents its own layout. Transformation logic lives in free-text cells like *"Convert to uppercase and validate"* (but what does "validate" mean, exactly?). Files get emailed, copied to SharePoint, and edited by three people at once. Which version is current? Nobody's entirely sure. And when an issue crops up in production six months later, nobody can trace the ambiguous spreadsheet cell back to a conscious decision.

**STM** — Source-To-Target Mapping — is a simple, readable language designed to replace those spreadsheets. It's a plain-text format that you can version in Git, review in pull requests, and — crucially — read without needing a decoder ring.

Think of STM as sitting between the business requirements and the implementation code. It captures **what** the data transformation should do — precisely enough that an engineer (or an AI agent) can implement it, yet readably enough that a BA can review and sign it off.

Here's the headline: **if you can read a column list in a database tool, you can read STM**. This tutorial will walk you through the syntax step by step, starting from the simplest possible mapping and building up to real-world complexity.

---

## Your First Mapping: Two Fields, One Line

Let's start with the smallest useful STM file. Imagine you're migrating customer records from an old system to a new one, and right now you only care about mapping the customer identifier.

```stm
source old_system {
  CUST_ID   INT
}

target new_system {
  customer_id   UUID
}

map {
  CUST_ID -> customer_id
}
```

Three blocks, and you can already see the entire story:

1. **`source`** — describes the structure of the data you're reading *from*.
2. **`target`** — describes the structure of the data you're writing *to*.
3. **`map`** — describes how fields in the source become fields in the target.

The arrow (`->`) is the heart of STM. Read it as *"maps to"* or *"becomes"*. `CUST_ID -> customer_id` means: take the value from `CUST_ID` in the source and put it into `customer_id` in the target.

That's it. You've just read your first STM file.

---

## Adding Data Types and Tags

Fields in a schema block follow a consistent pattern:

```
field_name    DATA_TYPE    [tags]
```

Tags appear in square brackets and capture metadata you'd normally scatter across several Excel columns — whether a field is a primary key, whether it's required, what values are allowed, and so on:

```stm
source old_system {
  CUST_ID       INT            [pk]
  CUST_TYPE     CHAR(1)        [enum: {R, B, G}]
  EMAIL_ADDR    VARCHAR(255)   [pii]
  CREDIT_LIMIT  DECIMAL(12,2)  [default: 0]
}

target new_system {
  customer_id     UUID           [pk, required]
  customer_type   VARCHAR(20)    [enum: {retail, business, government}, required]
  email           VARCHAR(255)   [format: email, pii]
  credit_limit    BIGINT         [default: 0]
}
```

Some of the tags you'll encounter most often:

| Tag | What It Means |
|-----|---------------|
| `pk` | Primary key |
| `required` | Must not be null or empty |
| `pii` | Personally identifiable information — flag for governance |
| `encrypt` | Must be encrypted (optionally specifying algorithm, e.g. `encrypt: AES-256-GCM`) |
| `enum: { a, b, c }` | Only these values are allowed |
| `default: val` | Default value if the source is null |
| `format: email` | Expected format (email, E.164, UUID, etc.) |
| `ref: table.field` | Foreign key reference to another schema |

Notice that **data types are freeform** — STM doesn't enforce a type system. You write whatever matches the real system: `VARCHAR(200)`, `STRING(200)`, `DECIMAL(12,2)`, `TIMESTAMPTZ`. The goal is to describe what actually exists, not to conform to an abstract type model.

---

## Transforms: Where the Logic Lives

A bare arrow (`->`) is fine for direct copies, but most real mappings require some transformation. In STM, you add transforms after a colon (`:`):

```stm
map {
  CUST_ID -> customer_id

  EMAIL_ADDR -> email : trim | lowercase | validate_email

  CREDIT_LIMIT -> credit_limit : coalesce(0) | * 100 | round
}
```

The pipe character (`|`) chains transforms left to right, exactly like a Unix pipeline. Reading the email mapping aloud: *"Take `EMAIL_ADDR`, trim leading and trailing whitespace, convert to lowercase, then validate it as an email address."*

The credit limit mapping: *"Take `CREDIT_LIMIT`, replace null with zero, multiply by 100 (converting pounds to pence), then round."*

This is one of STM's big wins over spreadsheets. Instead of a free-text cell saying *"Clean up and convert to cents"*, you get a precise, ordered sequence of operations that an engineer can implement directly. And because the pipeline reads left to right, you can trace the data flow step by step — there's no ambiguity about what happens first.

### Value Maps

When a source field uses codes that need translating to human-readable values, use a `map` transform:

```stm
CUST_TYPE -> customer_type
  : map { R: "retail", B: "business", G: "government", null: "retail" }
```

This replaces the classic Excel approach of listing value mappings in a separate tab or a comments column. Everything stays together on one line (or a few lines for longer lists). The special key `null` handles missing values; the special key `_` acts as a wildcard fallback for anything not explicitly listed.

### Conditional Logic (When/Else)

Sometimes the transformation depends on a condition. STM uses `when` / `else` blocks:

```stm
LOYALTY_POINTS -> loyalty_tier
  : when < 1000  => "bronze"
    when < 5000  => "silver"
    when < 10000 => "gold"
    else         => "platinum"
```

Read it just as you'd read a business rule: *"If loyalty points are below 1,000, assign 'bronze'; below 5,000, 'silver'; below 10,000, 'gold'; otherwise 'platinum'."*

### Computed Fields

Not every target field has a direct source. Some are calculated, some are constants, and some are derived from multiple source fields. The `=>` operator (no source field on the left) signals a **computed mapping**:

```stm
=> display_name
  : when CUST_TYPE in (null, "R") => trim(FIRST_NM + " " + LAST_NM)
    else => trim(COMPANY_NM)

=> migration_timestamp : now_utc()
```

The first example computes a display name by checking the customer type — if it's retail (or null), concatenate first and last name; otherwise use the company name. The second simply stamps the current UTC time.

### Fallback Sources

When a preferred source field might be null, `fallback` lets you specify an alternative:

```stm
LAST_MOD_DATE -> updated_at
  : parse("MM/DD/YYYY hh:mm:ss a") | to_utc
  fallback CREATED_DATE | parse("MM/DD/YYYY") | assume_utc
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
EMAIL_ADDR    VARCHAR(255)   [pii]           //! Not validated — contains garbage
CREATED_DATE  VARCHAR(10)                    //! Stored as MM/DD/YYYY string
STATE_PROV    VARCHAR(50)                    //? Should we normalise to 2-char codes?
```

---

## Notes: Rich Documentation In-Line

For longer explanations — context a developer or reviewer needs, data-quality background, open issues — STM supports **note blocks** using triple-quoted strings. Notes support Markdown, so you can use headings, bullet points, bold text, and links:

```stm
source legacy_sqlserver "CUSTOMER table — SQL Server 2008" {
  note '''
    ## Data quality overview
    This table was the primary customer store from 2005–2024.
    No application-level validation was enforced until 2018,
    resulting in significant data quality issues.
  '''

  PHONE_NBR  VARCHAR(50) {
    note '''
      No consistent format across the dataset. Sample analysis (50k records):
      - **42%** `(555) 123-4567` — US with parentheses
      - **31%** `555.123.4567` — dot-separated
      - **15%** `+15551234567` — already E.164
      - **8%** `5551234567` — raw 10-digit
      - **4%** other (international, extensions, garbage)
    '''
  }
}
```

Notes can appear at three levels:

- **Schema-level** — context about the entire source or target system.
- **Field-level** — attached directly to a specific field (inside a field block with curly braces).
- **Map-level** — in the mapping block itself, documenting assumptions or implementation guidance.

This means the documentation **travels with the specification**, not in a separate Confluence page that drifts out of date.

---

## The Integration Block: Project Metadata

Every mapping exists within a project context — who owns it, what version it is, what pattern it follows. The `integration` block captures this:

```stm
integration "Legacy_Customer_Migration_v2" {
  cardinality 1:1
  author "Data Migration Team"
  version "2.0.0"
  tags [migration, customer, phoenix-project]

  note '''
    # Legacy Customer Migration

    Part of **Project Phoenix** — decommissioning the legacy SQL Server 2008
    instance by Q2 2026. Migrates customer records to a normalised PostgreSQL
    schema with proper typing, encryption, and referential integrity.

    ## Constraints
    - Runs in **batches of 10,000** to prevent memory issues
    - Target enforces referential integrity — addresses created *before* customers
    - Estimated total: **2.4M records**, ~180 batches
  '''
}
```

The `cardinality` field describes the integration pattern at a glance:

| Cardinality | Sources | Targets | Meaning |
|-------------|---------|---------|---------|
| `1:1` | 1 | 1 | Simple point-to-point mapping |
| `1:N` | 1 | 2+ | Fan-out — one source feeds multiple targets |
| `N:1` | 2+ | 1 | Aggregation — multiple sources merge into one target |
| `N:M` | 2+ | 2+ | Hub — multiple sources feed multiple targets |

Tags are freeform and are useful for filtering and searching across a portfolio of mapping specifications.

---

## Natural Language Transforms: Bridging the Gap

Sometimes a transformation is too complex or too context-dependent to express as a neat chain of functions. Rather than leaving it as an ambiguous spreadsheet comment, STM provides `nl()` — a natural-language transform:

```stm
PHONE_NBR -> phone
  : nl("Extract all digits. If 11 digits starting with 1, treat as US.
        If 10 digits, assume US country code +1. Format as E.164.
        For other patterns, attempt to determine country from COUNTRY_CD.
        If unparseable, set null and log warning with original value.")
```

The `nl()` block says to both the engineer and any AI tooling: *"This needs custom implementation — here's the intent."* It's an honest acknowledgement that not every business rule can be reduced to a neat function call — but it still belongs *in the spec*, not in someone's head or lost in a meeting note.

`nl()` can also be mixed with parseable transforms in the same pipeline:

```stm
NOTES -> notes
  : nl("Filter profanity using corporate word list v3.2,
        replacing matches with asterisks")
  | escape_html
  | truncate(5000)
```

This is enormously valuable for BAs. You can describe complex business logic in plain English *within the mapping spec itself*, and it sits right next to the parseable transforms. No more hunting through email threads or Jira comments for the "real" requirements.

---

## Schema Keywords: Describing Different System Types

So far we've used `source` and `target`, but STM provides several schema keywords to better describe what you're working with:

| Keyword | Best Used For |
|---------|---------------|
| `source` | Explicit source system |
| `target` | Explicit target system |
| `table` | Database table |
| `message` | EDI messages, message queues, event buses |
| `record` | Flat files, CSV, fixed-length records |
| `event` | Domain events, webhooks |
| `schema` | Generic — when the role is ambiguous |
| `lookup` | Reference data used for enrichment only |

These keywords are **documentary, not behavioural** — they all produce identical blocks. What determines whether something is a source or target is how it appears in the `map` block. The keywords simply help the reader understand the nature of each system at a glance.

```stm
message edi_856 "EDI 856 Despatch Advice" @format(fixed-length) {
  // EDI message fields...
}

table postgres_db "Normalised customer schema — PostgreSQL 16" {
  // Database columns...
}

lookup country_codes "ISO 3166 country code mapping" {
  alpha2   STRING(2)    [pk]
  alpha3   STRING(3)
  name     STRING(100)
}
```

---

## Real-World Patterns

### Nested Structures and Groups

Real data is rarely flat. XML messages, JSON APIs, and EDI transactions all have nested structures. STM handles these with **groups** — curly-brace blocks that represent nested objects:

```stm
source order_api {
  orderId       STRING
  customerName  STRING
  shippingAddress {
    street    STRING(200)
    city      STRING(100)
    country   ISO-3166-a2
  }
  items[] {
    sku        STRING(8)   [required]
    quantity   INT32       [min: 1]
    unitPrice  DECIMAL(10,2)
  }
}
```

The `[]` suffix means "array of" — so `items[]` is a repeating group. In the mapping block, you reference nested fields using dot notation:

```stm
map order_api -> order_headers {
  orderId -> order_id
  shippingAddress.city -> ship_city
  shippingAddress.country -> ship_country : trim | uppercase
}
```

### Flatten: Exploding Arrays into Rows

A common ETL pattern is taking a single source record that contains an array and producing one output row per array element. STM calls this **flattening**:

```stm
map order_api -> order_lines [flatten: items[]] {
  orderId          -> order_id
  customerName     -> customer_name
  items[].sku      -> product_sku
  items[].quantity -> quantity
  items[].unitPrice -> unit_price
}
```

The `flatten: items[]` option on the map block tells the reader (and any tooling): *"For each element in the `items` array, emit one target row. Parent-level fields like `orderId` are repeated."*

This is one of those patterns that's notoriously difficult to express in a spreadsheet. You'd typically need a separate tab or a paragraph of explanation. In STM, it's a single option on the map header, and the array path references make the grain of the target table completely unambiguous.

### Multiple Sources and Targets

Enterprise integrations rarely involve just one source and one target. STM handles this with **explicit map blocks** that name the source-target pair:

```stm
source crm_system {
  customer_id    UUID
  email          EMAIL
  loyalty_points INT32
}

source payment_gateway {
  transaction_id   UUID
  customer_email   EMAIL
  amount           DECIMAL(12,2)
  status           ENUM   [enum: {pending, completed, failed}]
}

target analytics_db {
  customer_id       UUID
  email             VARCHAR(255)
  total_spent       DECIMAL(12,2)
  transaction_count INT
}

map crm_system -> analytics_db {
  customer_id -> customer_id
  email -> email
}

map payment_gateway -> analytics_db {
  amount -> total_spent
    : nl("Sum all transactions where status = 'completed',
          grouped by customer_email.")

  => transaction_count
    : nl("Count transactions where status = 'completed', per customer.")
}
```

Each map block clearly states which source feeds which target. This is far easier to follow than a spreadsheet with a "Source System" column that you have to filter.

---

## Imports and Reuse

In a large programme, you'll find the same structures appearing again and again — address blocks, audit columns, currency codes. STM lets you define these once and share them:

### Fragments

A **fragment** is a reusable set of fields:

```stm
// common.stm — a library file
fragment address_fields "Standard address block" {
  line1        STRING(200)   [required]
  line2        STRING(200)
  city         STRING(100)   [required]
  state        STRING(50)
  postal_code  STRING(20)    [required]
  country      ISO-3166-a2   [required]
}
```

You pull a fragment into a schema using the spread operator (`...`):

```stm
import { address_fields } from "lib/common.stm"

target customer_db {
  customer_id    UUID          [pk]
  display_name   VARCHAR(200)  [required]

  primaryAddress {
    ...address_fields
  }
}
```

The fields from `address_fields` are inlined as if you'd typed them directly. This keeps definitions consistent across dozens of mappings and means that when the address structure changes, you update it in one place.

### Lookups

A **lookup** is reference data used for enrichment:

```stm
lookup currency_rates "Daily FX rates" {
  from_ccy   ISO-4217       [pk]
  to_ccy     ISO-4217       [pk]
  rate       DECIMAL(18,8)
  as_of      DATE
}
```

Lookups can be referenced in transform expressions, making it explicit that a mapping depends on reference data.

### Imports

The `import` statement brings blocks from other files into scope:

```stm
import "lib/common.stm"                               // everything from the file
import { address_fields, audit_columns } from "lib/common.stm"  // specific blocks
import { customer as legacy_customer } from "legacy/schemas.stm" // with an alias
```

This supports splitting large specifications across multiple files — one per source system, perhaps, or one per domain — whilst keeping each individual file focused and readable.

---

## Annotations: Format-Specific Hints

When working with XML, EDI, CSV, or other structured formats, fields often need extraction hints that go beyond a simple name and type. STM uses **annotations** (prefixed with `@`) for this:

```stm
message commerce_order "Order XML" @format(xml)
  @ns ord = "http://example.com/commerce/order/v2" {

  Order @xpath("/ord:OrderMessage/ord:Order") {
    OrderId     STRING   @xpath("ord:OrderId")
    Channel     STRING   @xpath("ord:Channel")
    Customer {
      Email     STRING   @xpath("ord:Email")
    }
  }
}
```

Common annotations include:

| Annotation | Used With | Purpose |
|------------|-----------|---------|
| `@format(xml)` | Schema block | Declares the physical format |
| `@xpath(...)` | Fields/groups | XPath expression for XML extraction |
| `@pos(offset, length)` | Fields | Byte position for fixed-length records |
| `@header("Column Name")` | Fields | Column header for CSV/TSV files |
| `@filter(condition)` | Groups | Filters an array to matching elements |

You don't need to understand the technical details of every annotation — the important thing is that they keep format-specific extraction logic *inside the mapping spec* rather than buried in implementation code.

---

## Putting It All Together

Here's a realistic fragment of a Salesforce-to-Snowflake integration, the kind of mapping you might review as a BA on a revenue operations project:

```stm
import { currency_rates } from "lookups/finance.stm"

integration "SFDC_Opportunity_Ingestion" {
  cardinality 1:1
  author "Revenue Operations Team"
  version "3.4.1"
  tags [salesforce, snowflake, revenue-engine]

  note '''
    # Salesforce to Snowflake Pipeline
    Maps Sales Cloud `Opportunity` objects into the `ANALYTICS.RAW_SFDC` schema.

    ## Sync Strategy
    - **Incremental:** Uses `SystemModStamp` to pull changes every 15 minutes.
    - **Hard Deletes:** Captured via the `isDeleted` flag in SFDC.
  '''
}

source sfdc_opportunity "SFDC Opportunity Object" {
  Id              ID              [pk]
  Name            STRING(120)     [required]
  Amount          CURRENCY(18,2)
  CurrencyIsoCode STRING(3)       [default: USD]
  StageName       PICKLIST        [enum: {Prospecting, Qualification,
                                          "Value Prop", Closed_Won, Closed_Lost}]
  `ARR_Override__c` CURRENCY(18,2)  //! Manual override used by Finance
}

target snowflake_opps "FACT_OPPORTUNITIES" {
  opp_key          VARCHAR(18)    [pk]
  opportunity_name VARCHAR(120)
  amount_usd       NUMBER(18,2)   [note: "Converted at daily spot rate"]
  arr_value        NUMBER(18,2)   [required]
  pipeline_stage   VARCHAR(50)    [enum: {top_funnel, mid_funnel,
                                          closed_won, closed_lost}]
  is_closed        BOOLEAN
}

map sfdc_opportunity -> snowflake_opps {
  Id -> opp_key
  Name -> opportunity_name

  Amount -> amount_usd
    : nl("Multiply Amount by the rate found in currency_rates lookup
          using CurrencyIsoCode")
    | round(2)

  `ARR_Override__c` -> arr_value
    : fallback Amount
    | coalesce(0)

  StageName -> pipeline_stage
    : map {
        Prospecting: "top_funnel",
        Qualification: "mid_funnel",
        "Value Prop": "mid_funnel",
        Closed_Won: "closed_won",
        Closed_Lost: "closed_lost",
        _: "unknown"
      }

  => is_closed
    : StageName
    | map { Closed_Won: true, Closed_Lost: true, _: false }
}
```

Even if you've never seen STM before today, you can follow this specification and answer questions like:

- *"What happens if Amount is null?"* — The `arr_value` mapping shows `coalesce(0)`, so it becomes zero.
- *"How is pipeline stage determined?"* — There's an explicit value map from Salesforce picklist values to Snowflake categories.
- *"What about currency conversion?"* — The `amount_usd` mapping uses an `nl()` block explaining it uses the `currency_rates` lookup.
- *"What if the Finance team has overridden the ARR?"* — The `ARR_Override__c` field takes priority, with `Amount` as a fallback.

Compare that to hunting through a spreadsheet's comments column, a Confluence page, and a Slack thread to piece together the same answers.

### STM vs the Spreadsheet: A Side-by-Side

To make the contrast concrete, consider how the stage-mapping rule above would look in a typical Excel mapping document:

| Source Field | Target Field | Transformation | Notes |
|---|---|---|---|
| StageName | pipeline_stage | Map values (see lookup tab) | Prospecting=top_funnel, Qualification=mid_funnel, etc. |

That single row raises immediate questions. *"What about 'Value Prop' — is that top or mid funnel?"* *"What if the value doesn't match any of these?"* *"Where's the lookup tab — is it in this workbook or another one?"* The STM `map` transform answers all of these inline, with a `_` wildcard for unrecognised values. There's no lookup tab to lose, no ambiguity to resolve in a follow-up meeting.

---

## Quick Reference: The STM Building Blocks

| Concept | Syntax | Purpose |
|---------|--------|---------|
| Source/Target | `source name { ... }` | Describes a system's data structure |
| Field | `name TYPE [tags]` | One data element |
| Map block | `map source -> target { ... }` | Defines transformations between two schemas |
| Direct mapping | `A -> B` | Source field maps to target field |
| Transform | `A -> B : trim \| lowercase` | Mapping with a transformation pipeline |
| Computed field | `=> B : expression` | Target field with no direct source |
| Value map | `: map { X: "y", _: "default" }` | Code-to-value translation |
| Conditional | `: when cond => val else => val` | Branching logic |
| Fallback | `: fallback OTHER_FIELD` | Alternative source if primary is null |
| Natural language | `: nl("description")` | Complex logic in plain English |
| Note | `note '''...'''` | Rich Markdown documentation |
| Comment | `//` / `//!` / `//?` | Info / warning / question |
| Fragment | `fragment name { ... }` | Reusable field set |
| Spread | `...fragment_name` | Inline a fragment's fields |
| Import | `import { x } from "file.stm"` | Bring definitions from another file |
| Lookup | `lookup name { ... }` | Reference data for enrichment |
| Integration | `integration "name" { ... }` | Project metadata |
| Annotation | `@format(xml)`, `@xpath(...)` | Format-specific extraction hints |

---

## Next Steps

You don't need to memorise every detail in this tutorial. The key takeaways are:

1. **STM is readable** — if you can read a database column list, you can read STM.
2. **Everything lives in one place** — schema definitions, mapping logic, transformation rules, data-quality warnings, and documentation all sit together in a single versionable file.
3. **Precision replaces ambiguity** — instead of free-text descriptions, transforms are explicit pipelines. Where precision isn't practical, `nl()` blocks capture intent in natural language rather than leaving it to tribal knowledge.
4. **It scales** — from a two-field proof of concept to a multi-source enterprise data hub, STM uses the same consistent syntax.
5. **It versions naturally** — because STM files are plain text, they slot straight into Git. You get full change history, pull-request reviews, and the ability to diff two versions of a mapping side by side. No more "v7_FINAL_FINAL_reviewed_JK.xlsx".

### A practical review checklist

When you next review a mapping specification, try this approach:

1. **Start with the integration block.** Read the note for project context, constraints, and dependencies. Check the cardinality matches your understanding of the integration pattern.
2. **Scan the `//!` warnings.** These are known data-quality risks and issues. Make sure each one has a plan — is it handled in the transform, or is it an open item?
3. **Count the `//?` questions.** These are unresolved items. They should all be resolved before sign-off. If any remain, they're your action items.
4. **Walk the map block line by line.** For each mapping, ask: *"Does this transform match the business rule we agreed?"* Pay particular attention to value maps, conditionals, and `nl()` blocks — these encode your business logic.
5. **Check for computed fields (`=>`).**  These target fields have no direct source, so they're easy to miss. Make sure the derivation logic is correct and complete.
6. **Look at fallback expressions.** These define what happens when preferred data is missing. Confirm the fallback behaviour matches your requirements.

If everything checks out, you can sign it off with confidence. If something doesn't match, you can point to the exact line and say precisely what needs changing — no more ambiguous feedback on a 200-row spreadsheet.

That's a far cry from arguing over which version of the Excel file has the latest transformation logic.
