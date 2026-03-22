# Lesson 03 — Writing Schemas from Imperfect Inputs

## The Real World Is Messy

Nobody drafts a Satsuma file in a vacuum. The inputs you work from are:

- **Spreadsheets** with inconsistent column names and missing definitions
- **API documentation** that's six months out of date
- **Database extracts** with cryptic column names like `CUST_TYP_CD`
- **Sample payloads** (JSON, XML, CSV) that show structure but not rules
- **Conversations** where someone describes the target system from memory

The agent's job is to turn these messy inputs into well-formed Satsuma schemas. Your job is to provide the inputs, review the output, and correct what the agent gets wrong.

---

## What the Agent Needs from You

When you ask an agent to draft a schema, give it:

1. **The raw source material** — paste the spreadsheet, API doc, DDL, or sample payload.
2. **The system name and role** — "This is the source system, a SQL Server 2008 database called LegacyCRM."
3. **Any business context** — "The `CUST_TYPE` field should be R for retail, B for business, G for government, but some records have NULLs."
4. **What you're unsure about** — "I don't know whether `PHONE_NBR` has a consistent format."

The agent can draft the schema from item 1 alone, but items 2-4 make the result much better.

---

## Drafting a Schema from a Database Extract

Suppose you have this DDL from the legacy system:

```sql
CREATE TABLE CUSTOMER (
  CUST_ID       INT           NOT NULL PRIMARY KEY,
  CUST_TYPE     CHAR(1)       DEFAULT 'R',
  FIRST_NM      VARCHAR(100),
  LAST_NM       VARCHAR(100),
  EMAIL_ADDR    VARCHAR(255),
  CREATED_DATE  VARCHAR(10)
);
```

The agent produces:

```stm
schema legacy_customer (note "CUSTOMER table — Legacy CRM") {
  CUST_ID       INT           (pk, required)
  CUST_TYPE     CHAR(1)       (default R)
  FIRST_NM      VARCHAR(100)
  LAST_NM       VARCHAR(100)
  EMAIL_ADDR    VARCHAR(255)
  CREATED_DATE  VARCHAR(10)
}
```

This is structurally correct — but it's incomplete. You add context:

- "CUST_TYPE should be enum {R, B, G} but some records have NULL."
- "EMAIL_ADDR is PII and the data is not validated."
- "CREATED_DATE is stored as MM/DD/YYYY strings, not real dates."

The agent revises:

```stm
schema legacy_customer (note "CUSTOMER table — Legacy CRM") {
  CUST_ID       INT           (pk, required)
  CUST_TYPE     CHAR(1)       (enum {R, B, G}, default R)  //! some records have NULL
  FIRST_NM      VARCHAR(100)
  LAST_NM       VARCHAR(100)
  EMAIL_ADDR    VARCHAR(255)  (pii)                        //! not validated — contains garbage
  CREATED_DATE  VARCHAR(10)                                //! stored as MM/DD/YYYY string
}
```

This is the workflow: the agent generates valid structure from raw material, and you iteratively refine it with business knowledge.

---

## Drafting from a JSON Payload

Sample payloads are great for inferring structure. Given this JSON:

```json
{
  "orderId": "ORD-2024-001",
  "customer": {
    "id": "C-1234",
    "email": "alice@example.com"
  },
  "items": [
    { "sku": "WIDGET-A", "qty": 3, "price": 29.99 },
    { "sku": "GADGET-B", "qty": 1, "price": 149.50 }
  ],
  "total": 239.47
}
```

The agent drafts:

```stm
schema order_api (format json, note "Order API response payload") {
  orderId    STRING   (pk)
  total      DECIMAL(12,2)

  record customer {
    id       STRING
    email    STRING   (pii, format email)
  }

  list items {
    sku      STRING
    qty      INT32
    price    DECIMAL(12,2)
  }
}
```

Notice how:
- The nested `customer` object becomes a `record`.
- The `items` array becomes a `list`.
- Types are inferred from the sample values.
- `email` gets `pii` and `format email` because the agent recognizes the pattern.

---

## When to Preserve Ambiguity as a Note

Sometimes you don't know enough to specify a field precisely. The temptation is to make something up. Don't. Instead, preserve the ambiguity as a note:

```stm
schema legacy_payments {
  STATUS_CD    CHAR(2) (
    note "Values seen in sample: 'AP', 'RJ', 'PN', 'CL'. Meanings not documented."
  )                                                          //? need status code definitions

  PROCESS_DT   VARCHAR(20) (
    note "Sometimes YYYY-MM-DD, sometimes MM/DD/YYYY. Format depends on batch origin."
  )                                                          //! inconsistent date format
}
```

This is better than guessing. The `//?` comment makes the ambiguity discoverable across the workspace, and the `note` captures what you do know. When someone resolves the question later, they update the schema — the note becomes documentation of the decision.

---

## Reviewing Agent-Generated Schemas

After the agent drafts a schema, review it against these questions:

1. **Coverage** — Are all fields from the source material represented?
2. **Types** — Do the types match what you know about the data? (Is a date stored as a string? Is a number really a decimal, not an integer?)
3. **Metadata** — Are primary keys marked? Is PII flagged? Are enums listed?
4. **Warnings** — Are known data quality issues captured as `//!` comments?
5. **Open questions** — Are ambiguities captured as `//?` comments or notes, not silently resolved?
6. **Naming** — Do the field names match what the source system actually uses?

You don't need to check syntax — the agent and the parser handle that. You check meaning.

---

## The Excel-to-Satsuma Workflow

Many mapping projects start with an Excel spreadsheet. The agent follows a specific workflow to convert it:

### Step 1: Survey the workbook

The agent examines all tabs and identifies their roles:
- Which tabs contain mapping data?
- Which tabs are reference/lookup data?
- Which tabs are documentation or changelog?

### Step 2: Identify column roles

The agent determines which columns represent source field, source type, target field, target type, transformation logic, and notes. Column positions vary across spreadsheets — the agent does not assume fixed positions.

### Step 3: Plan the output

How many Satsuma files should be produced? Are there shared fragments or lookups that should be extracted?

### Step 4: Generate Satsuma

The agent produces schema blocks for sources and targets, mapping blocks with arrows, and notes for anything it cannot express structurally.

### Step 5: Self-critique

The agent reviews its own output against a checklist:
- Does every mapping row have a corresponding arrow?
- Are all source and target fields declared?
- Do types match the spreadsheet?
- Are complex transforms expressed as natural-language strings, not invented functions?
- Are data quality warnings and ambiguities preserved?

### Step 6: Report confidence

The agent tells you what it's confident about and what needs human review.

---

## Example: From Excel Row to Satsuma

An Excel mapping row like this:

| Source Field | Source Type | Target Field | Target Type | Transformation | Notes |
|---|---|---|---|---|---|
| CUST_TYPE | CHAR(1) | customer_type | VARCHAR(20) | R=Retail, B=Business, G=Government. If null, default to Retail | Some records have null values |

Becomes this Satsuma:

```stm
// In source schema:
CUST_TYPE    CHAR(1)    (enum {R, B, G})    //! some records have NULL

// In target schema:
customer_type VARCHAR(20) (enum {retail, business, government}, required)

// In mapping block:
CUST_TYPE -> customer_type {
  map {
    R: "retail"
    B: "business"
    G: "government"
    null: "retail"
  }
}
```

The agent expresses the enum mapping structurally using `map { }` and preserves the data quality warning as a `//!` comment.

---

## Common Mistakes When Drafting Schemas

| Mistake | What to do instead |
|---|---|
| Guessing field meanings | Use `note "..."` or `//?` to capture uncertainty |
| Inventing metadata tokens | Only use tokens from the spec (`pk`, `pii`, `enum`, etc.) |
| Marking source vs. target on the schema | Use `schema` for all — role is declared in the mapping |
| Using `STRUCT` or `ARRAY` types | Use `record Name { }` or `list Name { }` for nesting |
| Skipping data quality warnings | Capture them as `//!` — they matter for implementation |
| Over-specifying types from limited samples | Use broader types and document what you observed in a note |

---

## Key Takeaways

1. The agent drafts schemas from whatever raw material you provide — DDL, JSON, CSV, API docs, spreadsheets.
2. Your job is to supply business context and review the output for meaning, not syntax.
3. When you don't know something, preserve the ambiguity as a `note` or `//?` instead of guessing.
4. The Excel-to-Satsuma workflow follows a structured process: survey, identify columns, plan, generate, self-critique, report confidence.
5. Review agent-generated schemas for coverage, types, metadata, warnings, and open questions.

---

**Next:** [Lesson 04 — Reuse, Imports, and Multi-File Thinking](04-reuse-and-imports.md) — how fragments, imports, and shared definitions make large workspaces manageable.
