# Lesson 02 — Reading Satsuma with an Agent

## The Goal: Understanding Without Memorizing

When you open an unfamiliar Satsuma file for the first time, you should not try to become a syntax expert. Instead, you should be able to:

1. Identify the major blocks (schemas, mappings, transforms) at a glance.
2. Understand what each block represents in business terms.
3. Distinguish deterministic structure from natural-language intent.
4. Ask the agent to explain the parts you don't immediately understand.

This lesson teaches you how to read Satsuma files as a collaboration problem — not a memorization problem.

---

## Schema Blocks: The Foundation

A `schema` block describes the structure of a data source or target. It lists fields with their types and metadata:

```satsuma
schema legacy_sqlserver (
  note "CUSTOMER table — SQL Server 2008. No app-level validation until 2018."
) {
  CUST_ID         INT            (pk)
  CUST_TYPE       CHAR(1)        (enum {R, B, G}, default R)   //! some records have NULL
  FIRST_NM        VARCHAR(100)                                 // retail customers only
  LAST_NM         VARCHAR(100)                                 // retail customers only
  COMPANY_NM      VARCHAR(200)                                 // business/government only
  EMAIL_ADDR      VARCHAR(255)   (pii)                         //! not validated — contains garbage
  CREATED_DATE    VARCHAR(10)                                  //! stored as MM/DD/YYYY string
}
```

### Reading this schema block

Each line in the schema body follows the same pattern:

```
field_name    TYPE    (metadata)    // comment
```

- **Field name** — the column or attribute name (`CUST_ID`, `EMAIL_ADDR`).
- **Type** — the data type (`INT`, `VARCHAR(255)`, `CHAR(1)`).
- **Metadata** in `( )` — structural attributes like `pk`, `pii`, `enum {values}`, `default value`.
- **Comments** — `//` for context, `//!` for warnings, `//?` for open questions.

The schema keyword is used for **all** schemas — source, target, lookup, reference. The role (source vs. target) is declared in the mapping block, not on the schema itself.

---

## Metadata Tokens

Metadata appears inside parentheses and describes structural properties of fields or schemas. Common tokens:

| Token | Meaning |
|---|---|
| `pk` | Primary key |
| `required` | Field must not be null |
| `unique` | No duplicate values allowed |
| `indexed` | Field is indexed for performance |
| `pii` | Personally identifiable information |
| `encrypt` | Field should be encrypted (optionally: `encrypt AES-256-GCM`) |
| `enum {a, b, c}` | Allowed values |
| `default value` | Default value if not provided |
| `format email` | Expected format |
| `ref table.field` | Foreign key reference |
| `note "text"` | Inline documentation |

---

## Nested Structures: record and list

Real data is rarely flat. Satsuma uses `record` for single nested objects and `list_of record` for repeated structures:

```satsuma
schema mfcs_json (format json, note "MFCS Shipment Ingestion Format") {
  ShipmentHeader record {
    asnNo             STRING(30)   (required)
    shipDate          DATE         (required)
    supplier          NUMBER(10)   (required)

    asnDetails list_of record {
      orderNo         NUMBER(12)   (required)

      items list_of record {
        item            STRING(25)
        unitQuantity    NUMBER(12,4)  (required)
      }
    }
  }
}
```

- **`record`** = a single nested object (like a JSON object or XML element).
- **`list_of record`** = a repeated structure (like a JSON array or repeating XML element).

These can nest to any depth. The agent can help you navigate deeply nested schemas — you focus on understanding what the nesting means in business terms.

---

## Fragments: Reusable Field Sets

A `fragment` is a named group of fields that can be reused across multiple schemas:

```satsuma
fragment `address fields` {
  line1        STRING(200)    (required)
  line2        STRING(200)
  city         STRING(100)    (required)
  state        STRING(50)
  postal_code  STRING(20)     (required)
  country      ISO-3166-a2    (required)
}
```

Fragments are spread into schemas with `...`:

```satsuma
schema customer {
  customer_id  UUID  (pk)
  ...`address fields`
}
```

This inserts all the fragment's fields into the schema. It works like copy-paste at parse time — the parser expands the fragment, so downstream tools see the individual fields.

---

## Notes: Inline and Block

Notes carry natural-language documentation. They come in two forms:

### Inline notes (in metadata)

```satsuma
PHONE_NBR  VARCHAR(50) (note "No consistent format — 42% US with parens, 31% dot-separated")
```

### Block notes (standalone or with triple-quoted Markdown)

```satsuma
note {
  """
  # Legacy Customer Migration

  Part of **Project Phoenix** — decommissioning the legacy SQL Server 2008
  instance by Q2 2026. Migrates customer records to a normalized PostgreSQL
  schema with proper typing, encryption, and referential integrity.
  """
}
```

Triple-quoted strings (`"""..."""`) allow multi-line Markdown content. Double-quoted strings (`"..."`) are for shorter inline text.

---

## Reading a File with an Agent: The Workflow

When you encounter an unfamiliar Satsuma file, here is the approach:

### Step 1: Scan the structure

Look at the top-level blocks. How many `schema` blocks? Any `mapping` blocks? Any `fragment` or `transform` blocks? The file-level `note { }` block usually explains what the file is about.

### Step 2: Identify schemas and their roles

Schemas don't declare their role (source/target) — that happens in the mapping block. But their names and notes usually make it obvious: `legacy_sqlserver` is clearly a source; `postgres_db` is clearly a target.

### Step 3: Skim the fields

You don't need to read every field in detail. Look for:
- **`(pk)`** — what identifies records?
- **`(pii)`** — what's sensitive?
- **`//!`** — what data quality issues exist?
- **`//?`** — what's unresolved?
- **Nested `record`/`list_of record`** — what's the data shape?

### Step 4: Ask the agent

For anything you don't immediately understand, ask the agent. Good questions:

- *"Explain this schema in business terms."*
- *"What data quality issues does this file flag?"*
- *"What fields are marked as PII?"*
- *"Summarize what this file maps and how."*

The agent reads the structure deterministically and interprets the natural-language content. Together, you get a complete picture without having to parse every line yourself.

---

## Deterministic vs. Interpretive Content

This is worth reinforcing. In any schema block:

| Content | Type | Who handles it |
|---|---|---|
| Field name, type, metadata tokens | Deterministic | The parser extracts these exactly |
| `//` comments | Author context | Visible to humans and agents reading the file |
| `//!` warnings | Deterministic flags | The CLI can list all warnings across a workspace |
| `//?` questions | Deterministic flags | The CLI can list all open questions |
| `(note "...")` text | Natural language | The agent interprets; the CLI extracts verbatim |
| `note { """...""" }` blocks | Natural language | Same — the agent reasons about the content |

When you ask the agent to "explain this file," it gives you both the structural facts (from the parser) and the interpreted meaning (from the natural-language content). The structural facts are always exact. The interpretation is where human judgment matters.

---

## Exercise: Reading the Acme CRM Source Schema

Look at this source schema from the Acme Corp migration:

```satsuma
schema legacy_sqlserver (
  note "CUSTOMER table — SQL Server 2008. No app-level validation until 2018."
) {
  CUST_ID         INT            (pk)
  CUST_TYPE       CHAR(1)        (enum {R, B, G}, default R)   //! some records have NULL
  FIRST_NM        VARCHAR(100)                                 // retail customers only
  LAST_NM         VARCHAR(100)                                 // retail customers only
  COMPANY_NM      VARCHAR(200)                                 // business/government only
  EMAIL_ADDR      VARCHAR(255)   (pii)                         //! not validated — contains garbage
  PHONE_NBR       VARCHAR(50) (
    note """
    No consistent format across the dataset:
    - **42%** `(555) 123-4567` — US with parentheses
    - **31%** `555.123.4567` — dot-separated
    - **15%** `+15551234567` — already E.164
    - **8%** `5551234567` — raw 10-digit
    - **4%** other (international, extensions, garbage)
    """
  )
  CREATED_DATE    VARCHAR(10)                                  //! stored as MM/DD/YYYY string
  TAX_ID          VARCHAR(20)    (pii, encrypt)                //! plaintext in legacy — SSN or EIN
}
```

Without memorizing any syntax rules, you should be able to answer:

1. What is the primary key? (`CUST_ID`)
2. What fields contain sensitive data? (`EMAIL_ADDR`, `TAX_ID` — both marked `pii`)
3. What data quality issues exist? (NULL customer types, unvalidated emails, inconsistent phone formats, dates stored as strings, plaintext tax IDs)
4. What's the phone number format distribution? (Read the note — 42% US parens, 31% dot-separated, etc.)

These are the kinds of questions you should be able to answer by scanning, not studying.

---

## Key Takeaways

1. A `schema` block describes data structure — field names, types, and metadata.
2. `record` nests a single object; `list_of record` nests a repeated structure. Both can nest to any depth.
3. `fragment` defines reusable field groups, spread with `...`.
4. Notes carry natural language — inline with `(note "...")` or as block `note { """...""" }`.
5. Reading a Satsuma file is a collaboration: scan the structure, spot the flags, then ask the agent to explain the rest.

---

## Hands-On Check

Use a real corpus file instead of an invented snippet:

1. Open `examples/lib/common.stm` directly.
2. Identify the three top-level schemas and two fragments by eye.
3. Run `satsuma summary examples/sfdc-to-snowflake/pipeline.stm` and confirm the structural picture.
4. Ask yourself which facts came from the parser exactly and which explanations would require interpretation.

This is the reading pattern you want throughout the rest of the course.

---

**Next:** [Lesson 03 — Writing Schemas from Imperfect Inputs](03-writing-schemas.md) — how to turn spreadsheets, API docs, and sample payloads into valid Satsuma schemas.
