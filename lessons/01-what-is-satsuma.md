# Lesson 01 — What Is Satsuma & Your First File

Satsuma stands for **Structured Transform Markup**. It is a compact language for describing data structures, field mappings, and transformation intent in one place. The goal is to replace fragile spreadsheet-based mapping documents with something that is readable by humans, useful to AI agents, and stable enough for parser-first tooling.

This lesson introduces the core idea behind Satsuma and walks through your first working file. By the end, you will understand the delimiter model, the string and comment forms, and a minimal `schema` + `mapping` example.

## Why Satsuma Exists

Traditional mapping work often lives in Excel, Word, email threads, Jira tickets, and code comments at the same time. That creates predictable problems:

- schema definitions drift from implementation
- mapping logic gets split across multiple artifacts
- transformation intent is lost in ambiguous prose
- reviewers cannot diff changes cleanly
- automation and lineage tooling become harder than they should be

Satsuma puts these concerns into a single text artifact:

- `schema` blocks describe structure
- `mapping` blocks describe flow
- natural language stays first-class instead of being forced into fake code
- comments and notes preserve delivery context close to the mapping itself

## The Core Mental Model

Satsuma is built around one very simple rule:

- `( )` means metadata
- `{ }` means structure
- `" "` means natural language

That separation is the foundation of the language.

### `( )` Metadata

Parentheses annotate the thing immediately before them.

```stm
email STRING (pii, format email)
customer_id UUID (pk, required)
schema crm_customers (note "Legacy CRM extract")
```

Use metadata for flags and compact annotations such as `pk`, `required`, `enum`, `default`, `format`, `ref`, and `note`.

### `{ }` Structural Content

Braces hold child content: fields, arrows, note blocks, and transform bodies.

```stm
schema crm_customers {
  CUST_ID    INT
  EMAIL_ADDR STRING
}

mapping customer_sync {
  source { `crm_customers` }
  target { `warehouse_customers` }
  EMAIL_ADDR -> email
}
```

If something contains other Satsuma elements, it belongs in `{ }`.

### `" "` Natural Language

Double quotes capture human-readable intent.

```stm
note { "Initial customer migration from legacy CRM." }

PHONE_NBR -> phone {
  "Normalize to E.164. If invalid, set null and log a warning."
}
```

Satsuma does not force every transformation into a mini programming language. If plain English is the clearest expression of the rule, plain English is valid Satsuma.

## The Four String Forms You Will See

Satsuma uses a small set of quoting forms, each with a specific job.

### 1. Double Quotes

Use double quotes for ordinary natural language strings.

```stm
"Trim whitespace and lowercase the email address."
```

### 2. Triple Double Quotes

Use triple double quotes for multiline notes or richer Markdown documentation.

```stm
note {
  """
  # Migration Context

  Customer data is moving from SQL Server to Snowflake.
  Cutover is planned for Q2.
  """
}
```

### 3. Backticks

Use backticks for identifiers that contain special characters, spaces, or dots, or when you want to reference an exact identifier inside natural language.

```stm
`Lead_Source_Detail__c` STRING
"Look up `customer_id` in the target dimension."
```

### 4. Single Quotes

Use single quotes for block labels when the name contains spaces or special characters.

```stm
schema 'legacy customer extract' { ... }
mapping 'customer migration' { ... }
fragment 'address fields' { ... }
```

## The Three Comment Types

Satsuma has line comments only. Each form carries a different meaning.

### `//` Standard Comment

Author-side context. Tooling may strip this from exported output.

```stm
EMAIL_ADDR STRING // populated after 2017 only
```

### `//!` Warning

Use this when the file needs to surface a known issue or risk.

```stm
EMAIL_ADDR STRING //! not validated in the source system
```

### `//?` Question / TODO

Use this for open questions, unresolved assumptions, or follow-up work.

```stm
STATE_PROV STRING //? confirm whether full names are still allowed
```

These comment types matter because future tooling can distinguish routine commentary from delivery risk and open questions.

## Your First Satsuma File

Here is the smallest useful Satsuma document: one source schema, one target schema, and one mapping arrow.

```stm
note { "Customer sync from CRM to warehouse." }

schema crm_customers (note "Legacy CRM extract") {
  CUST_ID      INT           (pk)
  EMAIL_ADDR   VARCHAR(255)  (pii)
}

schema warehouse_customers (note "Warehouse customer table") {
  legacy_customer_id  INT           (unique)
  email               VARCHAR(255)  (format email, pii)
}

mapping customer_sync {
  source { `crm_customers` }
  target { `warehouse_customers` }

  CUST_ID -> legacy_customer_id
  EMAIL_ADDR -> email
}
```

This already gives you a lot:

- the source structure is explicit
- the target structure is explicit
- field-level intent is diffable
- lineage is readable from top to bottom

## Reading the Example

Start with the schemas:

- `crm_customers` describes the incoming shape
- `warehouse_customers` describes the outgoing shape

Then read the mapping:

- `source { ... }` identifies the source schema
- `target { ... }` identifies the target schema
- `CUST_ID -> legacy_customer_id` is a direct field mapping
- `EMAIL_ADDR -> email` is another direct field mapping

The `->` arrow is the most important operator in Satsuma. Read it as “maps to”.

## First Step of the Running Example

The lessons use a single running scenario: **Acme Corp migrating customer records from a legacy CRM into Snowflake**. Lesson 1 starts with only the first slice of that story.

```stm
note {
  "Acme Corp is migrating customer records from a legacy CRM to Snowflake."
}

schema legacy_crm (note "Initial extract from the SQL Server customer table") {
  CUST_ID     INT           (pk)
  EMAIL_ADDR  VARCHAR(255)  (pii)  //! quality is inconsistent in the source
}

schema snowflake_customers (note "Initial target customer model") {
  legacy_customer_id  INT
  email               VARCHAR(255)  (format email, pii)
}

mapping 'customer migration' {
  source { `legacy_crm` }
  target { `snowflake_customers` }

  CUST_ID -> legacy_customer_id
  EMAIL_ADDR -> email
}
```

This is intentionally small. Later lessons will add:

- more fields
- richer metadata
- reusable fragments
- transforms
- nested objects and arrays
- metrics

For now, the important thing is learning how Satsuma separates shape, flow, and intent.

## A Slightly Smarter First Mapping

Satsuma becomes more useful as soon as you add transformation intent.

```stm
mapping 'customer migration' {
  source { `legacy_crm` }
  target { `snowflake_customers` }

  CUST_ID -> legacy_customer_id

  EMAIL_ADDR -> email {
    trim | lowercase
  }
}
```

The transform body is structural, so it goes in `{ }`. The steps are mechanical, so they are written as a pipeline. In later lessons, you will combine these pipelines with natural language when the logic becomes more business-specific.

## Common Beginner Mistakes

- Putting metadata inside `{ }` instead of `( )`
- Using single quotes for natural language instead of double quotes
- Treating `{ }` as “any content” instead of structural content only
- Forgetting that backticks are for identifiers, not prose
- Writing transform intent as a comment when it should live in the mapping body

Wrong:

```stm
EMAIL_ADDR STRING { pii }
```

Right:

```stm
EMAIL_ADDR STRING (pii)
```

Wrong:

```stm
note { 'Customer sync' }
```

Right:

```stm
note { "Customer sync" }
```

## Practice

Create a file with:

1. one `note { }` block
2. one source `schema`
3. one target `schema`
4. one `mapping`
5. at least two arrows
6. one `//!` warning and one `//?` open question

If you can do that without mixing up the delimiter roles, you are ready for Lesson 2.

## Recap

Lesson 1 introduced the foundations of Satsuma:

- Satsuma replaces fragmented mapping documentation with a single structured artifact
- `( )`, `{ }`, and `" "` each have exactly one job
- Satsuma uses four quoting forms: double quotes, triple double quotes, backticks, and single-quoted labels
- comments come in three types: `//`, `//!`, and `//?`
- a minimal Satsuma file is already enough to describe source shape, target shape, and field flow

Next: [Lesson 02 — Schemas: Defining Your Data](02-schemas.md)
