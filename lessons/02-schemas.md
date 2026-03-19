# Lesson 02 — Schemas: Defining Your Data

In Lesson 1, you learned the basic STM mental model and wrote a minimal file with one source schema, one target schema, and one mapping. This lesson goes deeper into the `schema` block, because everything else in STM depends on describing data shape clearly and consistently first.

By the end of this lesson, you will be able to model:

- a flat database table
- a file extract with field-level metadata
- a nested API or JSON payload
- repeated collections using `list`
- durable documentation using field `note`

## What a Schema Does

A `schema` block defines the shape of a data asset. In STM, that could be:

- a database table
- a CSV or flat-file layout
- a JSON payload
- an XML document
- a protobuf message
- an API request or response body

STM deliberately uses one keyword, `schema`, for all of these. You do not need separate constructs for “table”, “message”, “source”, or “target”. The role of a schema is determined by how it is used later.

## Basic Schema Syntax

The shape is simple:

```stm
schema <name> (<metadata>) {
  <field declarations>
}
```

A minimal example:

```stm
schema customers {
  customer_id  UUID
  email        STRING
  created_at   TIMESTAMPTZ
}
```

Each field follows the same basic pattern:

```stm
<name>  <type>  (<metadata>)
```

Example:

```stm
email  VARCHAR(255)  (format email, pii)
```

This tells you three things:

- the field name is `email`
- the field type is `VARCHAR(255)`
- the field carries metadata: `format email` and `pii`

## Types in STM

STM does not hard-code a tiny fixed type system. Types are vocabulary tokens interpreted in context. That gives you freedom to represent the source faithfully instead of forcing everything into generic placeholders.

Common examples:

- `STRING`
- `VARCHAR(255)`
- `CHAR(2)`
- `INT`
- `BIGINT`
- `DECIMAL(12,2)`
- `BOOLEAN`
- `DATE`
- `TIMESTAMPTZ`
- `UUID`
- `JSON`
- `TEXT`

This flexibility matters because a Snowflake target, an XML source, and a SQL Server extract may all describe types differently. STM lets you preserve useful signal.

## Schema-Level Metadata

Metadata belongs in `( )` immediately after the schema name.

```stm
schema customers_export (format parquet, note "Daily curated customer export") {
  customer_id  UUID
  email        STRING
}
```

Schema-level metadata is useful for things like:

- `format parquet`
- `format xml`
- `note "..."`
- XML namespaces and other format-specific annotations

Example with format-specific metadata:

```stm
schema commerce_order (
  format xml,
  namespace ord "http://example.com/commerce/order/v2",
  namespace com "http://example.com/common/v1",
  note "Canonical order message from the integration bus"
) {
  record Order (xpath "/ord:OrderMessage/ord:Order") {
    OrderId  STRING  (xpath "ord:OrderId")
  }
}
```

The schema still works the same way. The metadata simply gives downstream readers and tools more context.

## Field Metadata

Field metadata is where most schema meaning lives. STM v2 explicitly calls out these common metadata tokens:

- `pk`
- `required`
- `unique`
- `indexed`
- `pii`
- `encrypt`
- `enum`
- `default`
- `format`
- `ref`

### `pk`

Marks a primary key field.

```stm
customer_id UUID (pk)
```

### `required`

Marks a field that must be present or populated.

```stm
email VARCHAR(255) (required)
```

### `unique`

Marks a field that should contain unique values.

```stm
legacy_customer_id INT (unique)
```

### `indexed`

Marks a field that is indexed or should be indexed in the target.

```stm
account_key VARCHAR(18) (indexed)
```

### `pii`

Marks personally identifiable information.

```stm
email VARCHAR(255) (pii)
tax_id STRING (pii)
```

### `encrypt`

Marks sensitive data that should be encrypted or is stored encrypted.

```stm
tax_identifier TEXT (pii, encrypt)
secret_value TEXT (encrypt AES-256-GCM)
```

### `enum`

Constrains a field to a known set of values.

```stm
status VARCHAR(20) (enum {active, suspended, closed})
```

Quoted values are fine when the enum values contain spaces or punctuation.

```stm
stage STRING (enum {Prospecting, Qualification, "Value Prop"})
```

### `default`

Captures a default value or source-system assumption.

```stm
country_code CHAR(2) (default US)
loyalty_points INT (default 0)
```

### `format`

Adds a semantic or validation-oriented format hint.

```stm
email VARCHAR(255) (format email)
phone VARCHAR(20) (format E.164)
```

### `ref`

Captures a reference to another entity.

```stm
address_id UUID (ref addresses.id)
account_id ID (ref sfdc_account.Id)
```

## Combining Metadata

Metadata tokens can be combined inside the same `( )` block.

```stm
email VARCHAR(255) (required, format email, pii)
customer_id UUID (pk, required)
tax_identifier TEXT (pii, encrypt AES-256-GCM)
```

The point is not to compress everything into one line. The point is to keep the field declaration readable while still carrying the details needed for delivery, review, and automation.

## Field Notes

When a field needs durable documentation, use `note` in metadata, not a plain comment.

Short form:

```stm
email VARCHAR(255) (pii, note "Not validated before 2018")
```

Long form:

```stm
PHONE_NBR VARCHAR(50) (
  note """
  Source values are inconsistent:
  - some are already E.164
  - some are local US numbers
  - some include extensions
  - some contain junk characters
  """
)
```

Use a field `note` when the information should travel with the spec and appear in exported documentation. Use `//` comments when the information is only for authors working in the raw file.

## Flat Schema Example

Here is a realistic flat schema for a legacy customer table:

```stm
schema legacy_crm (
  note "SQL Server customer extract"
) {
  CUST_ID         INT            (pk)
  CUST_TYPE       CHAR(1)        (enum {R, B, G}, default R)
  FIRST_NM        VARCHAR(100)
  LAST_NM         VARCHAR(100)
  COMPANY_NM      VARCHAR(200)
  EMAIL_ADDR      VARCHAR(255)   (pii, format email)
  PHONE_NBR       VARCHAR(50)    (
    note "Mixed formats across the source estate"
  )
  COUNTRY_CD      CHAR(2)        (default US)
  ACCOUNT_STATUS  CHAR(1)        (enum {A, S, C, D}, default A)
  CREATED_DATE    VARCHAR(10)
  TAX_ID          VARCHAR(20)    (pii, encrypt)
}
```

This is still just structure. No mapping logic yet. That is intentional. Good mapping work starts with an honest description of the source and target shapes.

## Nested Structures with `record`

Not all data is flat. APIs, JSON payloads, XML documents, and event messages often contain nested objects. Use `record` for a single nested structure.

```stm
schema order_message {
  order_id STRING (pk)

  record customer {
    customer_id STRING
    email       STRING (pii)
    tier        STRING
  }
}
```

You can read that as:

- the top-level schema has `order_id`
- it also has a nested object called `customer`
- `customer` contains its own child fields

`record` can also carry metadata:

```stm
record Order (xpath "/ord:OrderMessage/ord:Order") {
  OrderId  STRING  (xpath "ord:OrderId")
}
```

## Repeated Structures with `list`

Use `list` for repeated child structures.

```stm
schema order_message {
  order_id STRING (pk)

  list line_items {
    sku        STRING   (required)
    quantity   INT      (required)
    unit_price DECIMAL(12,2)
  }
}
```

This models an array-like or repeating collection of `line_items`.

Typical cases:

- JSON arrays
- repeated XML elements
- repeated protobuf fields
- one-to-many child records inside a message

## Mixing `record` and `list`

You can nest structures to any depth.

```stm
schema commerce_order (
  format xml,
  namespace ord "http://example.com/commerce/order/v2"
) {
  record Order (xpath "/ord:OrderMessage/ord:Order") {
    OrderId        STRING
    OrderTimestamp STRING

    record Customer {
      CustomerId   STRING
      Email        STRING (pii, format email)
    }

    record Totals {
      TotalAmount  DECIMAL(12,2)
      TaxAmount    DECIMAL(12,2)
    }

    list LineItems (xpath "ord:LineItems/ord:LineItem") {
      LineNumber      INT
      SKU             STRING
      Quantity        INT
      ExtendedAmount  DECIMAL(12,2)
    }
  }
}
```

This single schema can represent an entire hierarchical order message cleanly without inventing separate pseudo-schemas for each level.

## Extending the Running Example

Lesson 1 introduced the first slice of the Acme customer migration. Here is the next step: a richer source schema and a more explicit target schema.

```stm
schema legacy_crm (
  note "Initial SQL Server customer extract for migration"
) {
  CUST_ID         INT            (pk)
  CUST_TYPE       CHAR(1)        (enum {R, B, G}, default R)
  FIRST_NM        VARCHAR(100)
  LAST_NM         VARCHAR(100)
  COMPANY_NM      VARCHAR(200)
  EMAIL_ADDR      VARCHAR(255)   (pii)
  PHONE_NBR       VARCHAR(50)    (
    note """
    Several source formats exist:
    - local 10-digit values
    - already-normalized international values
    - free-text with extensions
    """
  )
  ADDR_LINE_1     VARCHAR(200)
  ADDR_LINE_2     VARCHAR(200)
  CITY            VARCHAR(100)
  STATE_PROV      VARCHAR(50)
  ZIP_POSTAL      VARCHAR(20)
  COUNTRY_CD      CHAR(2)        (default US)
  ACCOUNT_STATUS  CHAR(1)        (enum {A, S, C, D}, default A)
  CREATED_DATE    VARCHAR(10)
  LAST_MOD_DATE   VARCHAR(20)
  TAX_ID          VARCHAR(20)    (pii, encrypt)
}

schema snowflake_customers (
  format parquet,
  note "Curated customer dataset in Snowflake"
) {
  customer_id         UUID           (pk, required)
  legacy_customer_id  INT            (unique, indexed)
  customer_type       VARCHAR(20)    (enum {retail, business, government}, required)
  display_name        VARCHAR(200)   (required)
  email               VARCHAR(255)   (format email, pii)
  phone               VARCHAR(20)    (format E.164)
  status              VARCHAR(20)    (enum {active, suspended, closed, delinquent})
  created_at          TIMESTAMPTZ    (required)
  updated_at          TIMESTAMPTZ
  tax_identifier      TEXT           (pii, encrypt)
}
```

Nothing here says how to transform one into the other yet. That comes in the mapping lessons. This lesson is about being precise about shape first.

## Database, JSON, XML, and Files All Fit the Same Pattern

A useful STM habit is to stop thinking “What syntax do I use for this source type?” and start thinking “What is the structure, and what metadata helps explain it?”

Flat relational table:

```stm
schema customers_table {
  customer_id INT (pk)
  email       VARCHAR(255)
}
```

JSON-style object:

```stm
schema customer_event {
  event_id STRING
  record payload {
    customer_id STRING
    email       STRING
  }
}
```

XML-style document:

```stm
schema customer_xml (format xml) {
  record Customer (xpath "/Customer") {
    CustomerId STRING (xpath "CustomerId")
    Email      STRING (xpath "Email")
  }
}
```

The model stays consistent. Only the metadata changes.

## Common Schema Mistakes

- Using `source` or `target` as schema keywords instead of `schema`
- Putting field notes in comments when they should be durable `note` metadata
- Flattening nested payloads into fake top-level names too early
- Forgetting that `record` is one nested object and `list` is a repeated structure
- Treating STM types as if they must conform to one universal validator

Wrong:

```stm
source customers {
  id INT
}
```

Right:

```stm
schema customers {
  id INT
}
```

Wrong:

```stm
PHONE_NBR VARCHAR(50) // inconsistent format, export this note
```

Right:

```stm
PHONE_NBR VARCHAR(50) (note "Inconsistent format across legacy records")
```

Wrong:

```stm
customer_email STRING
customer_tier STRING
```

Right:

```stm
record customer {
  email STRING
  tier  STRING
}
```

## Practice

Model each of these as a `schema`:

1. a customer CSV extract with `id`, `email`, `country`, and `created_date`
2. an API response with a top-level `request_id`, one nested `customer` object, and a repeated `orders` array
3. a warehouse target table that marks PII, primary keys, defaults, and references explicitly

If you can do that cleanly, you are ready for reusable fragments and imports.

## Recap

Lesson 2 covered the full schema foundation:

- `schema` is STM’s universal structure block for tables, files, payloads, and messages
- fields follow a simple `name type (metadata)` pattern
- types are context-aware vocabulary, not a rigid fixed type system
- metadata captures delivery-critical meaning such as keys, formats, enums, defaults, references, PII, and encryption
- `note` metadata is the durable way to document schemas and fields
- `record` models one nested object
- `list` models a repeated nested structure

Next: [Lesson 03 — Fragments & Imports: Reusable Building Blocks](03-fragments-and-imports.md)
