# STM Language Specification

## Source-To-Target Mapping Language — v1.0.0

---

## 1. Introduction

### 1.1 Purpose

**STM** is a domain-specific language for describing data transformations between source and target systems. It replaces ad-hoc spreadsheets, verbose YAML, and ambiguous wiki pages with a single, parseable, human-readable, AI-friendly format.

STM is designed to be the **single source of truth** for data integration requirements — readable by business analysts, writable by data engineers, and natively understood by AI agents.

### 1.2 Design Principles

| Principle | How STM achieves it |
|---|---|
| **Human-first readability** | One-line-per-field, familiar syntax borrowed from DBML/SQL/HCL, minimal ceremony |
| **Token efficiency** | ~40-60% fewer tokens than equivalent YAML for the same mapping; implicit scoping eliminates repetition |
| **AI-native** | Compact grammar fits in a system prompt; `nl()` allows natural-language intent alongside parseable transforms |
| **Separation of concerns** | Structure (schema blocks) is separated from logic (map blocks) |
| **Progressive complexity** | Simple mappings are one line; complex ones add transforms, notes, lookups as needed |
| **Format-agnostic** | Describes logical structure of any data: databases, APIs, EDI, XML, CSV, events, messages |

### 1.3 Notation Conventions

Throughout this spec:

- `monospace` indicates literal syntax or keywords
- *italic* indicates a placeholder or variable
- `[brackets]` indicate optional elements
- `{braces}` indicate repetition (one or more)
- `(parens)` indicate grouping
- `|` indicates alternatives
- `UPPER_CASE` in grammar rules indicates terminals

---

## 2. File Structure

A valid `.stm` file contains a sequence of **top-level declarations** in any order:

```
file = { import_stmt | integration_block | schema_block | fragment_block | map_block }
```

The recommended ordering convention is:

1. Imports
2. Integration block (project metadata)
3. Source schema blocks
4. Target schema blocks
5. Lookup schema blocks
6. Fragment blocks
7. Map blocks

Files that contain only schema/fragment/lookup blocks (no integration or map) are considered **library files** and are intended for import by other files.

### 2.1 File Extension

STM files use the `.stm` extension.

### 2.2 Encoding

STM files must be UTF-8 encoded. A BOM is permitted but not required.

### 2.3 Line Endings

Both LF (`\n`) and CRLF (`\r\n`) are accepted. Parsers must normalize to LF internally.

---

## 3. Lexical Elements

### 3.1 Comments

STM supports three comment styles, each carrying semantic weight:

```stm
// This is an informational comment (neutral)
//! This is a warning comment (risk, issue, known problem)
//? This is a question/TODO comment (open item, needs resolution)
```

Comments extend to the end of the line. They may appear on their own line or at the end of a statement.

**Semantic meaning:** Tooling (linters, renderers, AI agents) should surface `//!` and `//?` comments with appropriate severity. A linter may report a count of unresolved `//?` items.

### 3.2 Identifiers

Unquoted identifiers must match:

```
ident = LETTER ( LETTER | DIGIT | "_" | "-" )*
LETTER = [a-zA-Z]
DIGIT  = [0-9]
```

Identifiers are **case-sensitive**: `Customer` and `customer` are different names.

### 3.3 Backtick-Quoted Identifiers

Field names that don't match the identifier pattern must be enclosed in backticks:

```stm
`Customer Name`        // spaces
`3PL_Code`             // starts with digit
`cost/unit`            // special characters
`source`               // reserved keyword
`line.item.no`         // contains dots (not a path)
`field``name`          // literal backtick (doubled)
```

**Escaping rule:** A literal backtick within a backtick-quoted identifier is represented by two consecutive backticks (`` `` ``). No other escape sequences exist.

**When required:** Backticks are required when the name contains any character outside `[a-zA-Z0-9_-]`, starts with a digit, or collides with a reserved keyword.

### 3.4 Reserved Keywords

The following words are reserved and must be backtick-quoted when used as identifiers:

```
import from as
integration source target table message record event schema lookup fragment
map note
true false null
```

### 3.5 String Literals

**Single-line strings** use double quotes:

```stm
"This is a string"
"Contains \"escaped\" quotes"
"Line one\nLine two"
```

Standard escape sequences: `\"`, `\\`, `\n`, `\t`, `\r`.

**Multi-line strings** use triple single quotes:

```stm
note '''
  This is a multi-line string.
  It preserves line breaks and indentation.

  Markdown content is idiomatic here.
'''
```

Triple-quoted strings:
- Begin after `'''` and a newline
- End at the first `'''` on its own (possibly indented) line
- Common leading whitespace is stripped (dedented)
- No escape sequences are processed (raw content)

### 3.6 Numeric Literals

```
number = ["-"] DIGITS ["." DIGITS]
DIGITS = DIGIT+
```

### 3.7 Whitespace and Layout

Whitespace (spaces and tabs) is insignificant except within strings. Newlines are significant as statement terminators — each field declaration, mapping entry, or annotation occupies one logical line.

**Line continuation:** A line ending with `\` continues onto the next line:

```stm
PHONE_NBR -> phone \
  : digits_only | prepend("+1") | to_e164
```

Transform continuation lines starting with `:` are implicitly continued (no `\` needed):

```stm
LOYALTY_POINTS -> loyalty_tier
  : when < 1000  => "bronze"
  : when < 5000  => "silver"
  : when < 10000 => "gold"
  : else            "platinum"
```

---

## 4. Import Declarations

Imports allow splitting definitions across multiple files for reuse and organization.

### 4.1 Wildcard Import

Imports all top-level blocks from the target file:

```stm
import "path/to/file.stm"
```

All schema blocks, fragments, and lookups from the imported file become available in the importing file as if declared inline. Integration and map blocks are **not** imported (they are file-local).

### 4.2 Named Import

Imports specific blocks by their schema ID:

```stm
import { edi_desadv, product_catalog } from "schemas/common.stm"
```

Only the named blocks are brought into scope.

### 4.3 Aliased Import

Renames a block on import to avoid conflicts:

```stm
import { customer as legacy_customer } from "legacy/schemas.stm"
import { customer as new_customer }    from "modern/schemas.stm"
```

### 4.4 Path Resolution

- Paths are **relative** to the importing file's directory
- Paths starting with `/` are **absolute** from the project root
- Path aliases may be defined in `stm.config` (see Section 12)
- The `.stm` extension may be omitted: `import "lib/common"` resolves to `lib/common.stm`
- Circular imports are a **parser error**
- Duplicate schema IDs across imports (without aliasing) are a **parser error**

---

## 5. Integration Block

The integration block provides project-level metadata. At most one integration block may appear per file.

```
integration_block = "integration" string_literal "{" integration_body "}"
integration_body  = { integration_field | note | comment }
```

### 5.1 Fields

| Field | Required | Type | Description |
|---|---|---|---|
| `cardinality` | Yes | Token | Integration pattern: `1:1`, `1:N`, `N:1`, or `N:M` |
| `author` | No | String | Owning team or individual |
| `version` | No | String | Version of this integration spec |
| `tags` | No | List | Freeform tags for categorization |

### 5.2 Example

```stm
integration "Legacy_Customer_Migration_v2" {
  cardinality 1:1
  author "Data Migration Team - Equal Experts"
  version "2.1.0"
  tags [migration, customer, phoenix-project]

  note '''
    # Migration Context

    Part of the **Project Phoenix** database modernization.
    Legacy SQL Server 2008 being decommissioned Q2 2026.

    ## Dependencies
    - Address normalization service must be running
    - Secrets Manager must have `tax_encryption_key` provisioned
  '''
}
```

### 5.3 Cardinality Semantics

| Value | Sources | Targets | Description |
|---|---|---|---|
| `1:1` | Exactly 1 | Exactly 1 | Simple point-to-point |
| `1:N` | Exactly 1 | 2+ | Fan-out / distribution |
| `N:1` | 2+ | Exactly 1 | Aggregation / merge |
| `N:M` | 2+ | 2+ | Hub / complex routing |

Parsers should **warn** (not error) if the declared cardinality doesn't match the actual count of source and target schema blocks in scope.

---

## 6. Schema Blocks

Schema blocks define the structure of data sources, targets, and lookup resources. They are the core structural element of STM.

### 6.1 Block Keywords

The following keywords are **synonyms** — all produce structurally identical blocks:

| Keyword | Suggested usage |
|---|---|
| `source` | Explicit source system |
| `target` | Explicit target system |
| `table` | Database table |
| `message` | EDI, message queue, event bus |
| `record` | Flat file, COBOL copybook, fixed-length |
| `event` | Domain event, webhook |
| `schema` | Generic / when role is ambiguous |
| `lookup` | Reference data for enrichment only |

**The keyword is documentary, not behavioral.** A block's role as source, target, or lookup is determined by how it's referenced in `map` blocks. The `lookup` keyword is the exception — it signals the block is used exclusively for lookups, never as a mapping endpoint.

### 6.2 Syntax

```
schema_block = block_kw ident [string_literal] "{" schema_body "}"
schema_body  = { annotation | note | field | group | spread | comment
                | selection_criteria }
```

### 6.3 Fields

A field declaration occupies a single line:

```
field = ident type_expr [tag_list] [field_block]
```

The components are:

```stm
field_name    TYPE_EXPR    [tag1, tag2: value]    // optional comment
```

#### Type Expressions

Type expressions name the data type with optional parameters:

```
type_expr = ident [ "(" params ")" ]
params    = param { "," param }
param     = number | string_literal | ident
```

Examples:

```stm
customer_id    UUID
name           VARCHAR(200)
price          DECIMAL(10,2)
status         STRING
created_at     TIMESTAMPTZ
record_type    CHAR(1)
stock          INT32
payload        BLOB
tags           JSON
```

**Type names are freeform.** STM does not mandate a type system — types are descriptive labels that should match the system being described. `VARCHAR(200)`, `STRING(200)`, `String(200)` are all valid. Tooling may define canonical type mappings.

#### Tag Lists

Tags are enclosed in square brackets, comma-separated:

```
tag_list  = "[" tag { "," tag } "]"
tag       = ident [ ":" tag_value ]
tag_value = string_literal | number | ident { ident }
```

Reserved tag names with standard semantics:

| Tag | Meaning |
|---|---|
| `pk` | Primary key |
| `required` | Field must not be null/missing |
| `unique` | Values must be unique |
| `indexed` | Field is indexed |
| `pii` | Personally identifiable information |
| `encrypt` | Must be encrypted (optionally: `encrypt: AES-256-GCM`) |
| `default: val` | Default value |
| `enum: a b c` | Allowed values (space-separated within tag) |
| `format: fmt` | Expected format (e.g., `email`, `E.164`, `uuid`) |
| `min: n` | Minimum value |
| `max: n` | Maximum value |
| `pattern: "regex"` | Regex pattern |
| `ref: table.field` | Foreign key reference |

Custom tags are permitted. Tooling should pass through unrecognized tags without error.

#### Field Blocks

A field may be followed by a block containing a `note`:

```stm
PHONE_NBR  VARCHAR(50) {
  note '''
    ## Known formats in production
    - **42%** `(555) 123-4567`
    - **31%** `555.123.4567`
    - **15%** `+15551234567`
  '''
}
```

This attaches the note specifically to that field.

### 6.4 Groups (Nested Objects)

Groups represent nested structures:

```
group = ident ["[]"] "{" { annotation | note | field | group | spread | comment } "}"
```

Without `[]`:

```stm
shippingAddress {                 // nested object
  street     STRING(200)
  city       STRING(100)
  country    ISO-3166-a2
}
```

With `[]`:

```stm
items[] {                         // array of objects
  sku        STRING(8)  [required]
  quantity   INT32      [min: 1]
  unitPrice  DECIMAL(10,2)
}
```

An array of primitives is declared as a field with `[]` suffix:

```stm
tags[]   STRING                   // array of strings
scores[] INT32                    // array of integers
```

Groups may be nested to arbitrary depth.

### 6.5 Annotations

Annotations provide format-specific extraction hints and filters. They apply to the field or group that immediately follows them, or to the enclosing block if placed at the top.

```
annotation = "@" ident [ "(" params ")" ]
           | "@" ident string_literal "=" string_literal
```

#### @format

Declares the physical format of the source data. Placed at the top of a schema block.

```stm
message edi_856 "EDI 856 Despatch Advice" {
  @format fixed-length
  // ...
}

source order_xml "Legacy Order XML" {
  @format xml
  // ...
}

record daily_extract "Batch CSV" {
  @format csv
  // ...
}
```

Recognized values: `json`, `xml`, `csv`, `tsv`, `fixed-length`, `edi`, `avro`, `parquet`, `protobuf`. Custom values are permitted.

#### @pos

Byte/character position for fixed-length formats:

```stm
RECID    CHAR(1)     @pos(0, 1)       // offset 0, length 1
IHXCTL   CHAR(14)    @pos(1, 14)      // offset 1, length 14
```

#### @xpath

XPath expression for XML sources:

```stm
source order_xml {
  @format xml
  @ns ord = "http://example.com/orders/v2"

  OrderHeader {                        @xpath("//ord:Order/ord:Header")
    OrderNumber  STRING                @xpath("ord:OrderNum")
    CustomerCode STRING(10)            @xpath("ord:CustCode")
  }
}
```

#### @ns

XML namespace declaration. Only valid inside `@format xml` blocks:

```stm
@ns ord  = "http://example.com/orders"
@ns ship = "http://example.com/shipping"
```

#### @header

Column header name for CSV/TSV sources:

```stm
record csv_extract {
  @format csv
  customer_name  STRING    @header("Customer Name")
  order_total    DECIMAL   @header("Order Total (USD)")
}
```

#### @filter

Filters an array to a subset based on a field value. Applied to a group to create a logical view:

```stm
POReferences[] {
  @filter REFQUAL == "ON"
  REFQUAL   CHAR(3)
  REFNUM    CHAR(35)
}

ShipmentRefs[] {
  @filter REFQUAL == "SRN"
  REFQUAL   CHAR(3)
  REFNUM    CHAR(70)
}
```

Multiple `@filter` annotations on the same group are ANDed.

#### @path

Generic extraction path for formats not covered by `@xpath`, `@pos`, or `@header`:

```stm
@path "$.data.customers[*]"          // JSONPath
@path "SEG/COMPOSITE/ELEMENT"        // EDI segment path
```

### 6.6 Selection Criteria

For database sources that require specific queries, a `selection_criteria` block captures the extraction SQL or logic:

```stm
source supplier_db {
  selection_criteria '''
    SELECT b.num, b.jlo_supplier_ind, a.org_id_ukrep
    FROM timptrm a
    RIGHT OUTER JOIN tsupplr b ON a.ot_bcode = b.num
    AND a.rstatus = 'A'
    WHERE num IN (<supplier_list>) WITH UR;
  '''

  NUM                 NUMBER(10)
  JLO_SUPPLIER_IND    CHAR(1)
  ORG_ID_UKREP        INTEGER
}
```

### 6.7 Fragment Spread

Fragments (see Section 7) are composed into schema blocks using the `...` spread operator:

```stm
target customer_db {
  customer_id   UUID          [pk]
  display_name  VARCHAR(200)  [required]

  primaryAddress {
    ...address_fields              // fields from fragment inlined here
    //! Legacy data has full state names
  }
}
```

Additional fields and comments may appear alongside the spread. Fields declared after a spread may override fields from the fragment (last declaration wins).

### 6.8 Complete Example

```stm
source legacy_sqlserver "Legacy CUSTOMER table from SQL Server 2008" {
  note '''
    ## Data quality overview
    This table was the primary customer store from 2005-2024.
    No validation was enforced at the application layer until 2018.
  '''

  CUST_ID         INT             [pk]                         // Sequential, gaps exist
  CUST_TYPE       CHAR(1)         [enum: R B G, default: R]    //! Some records have NULL
  FIRST_NM        VARCHAR(100)
  LAST_NM         VARCHAR(100)
  COMPANY_NM      VARCHAR(200)
  EMAIL_ADDR      VARCHAR(255)    [pii]                        //! Not validated, contains garbage
  PHONE_NBR       VARCHAR(50) {
    note '''
      No consistent format. Sample analysis shows:
      - **42%** `(555) 123-4567`
      - **31%** `555.123.4567`
      - **15%** already E.164
      - **12%** other/garbage
    '''
  }
  ADDR_LINE_1     VARCHAR(200)
  ADDR_LINE_2     VARCHAR(200)
  CITY            VARCHAR(100)
  STATE_PROV      VARCHAR(50)                                  //! Full names AND abbreviations
  ZIP_POSTAL      VARCHAR(20)
  COUNTRY_CD      CHAR(2)         [default: US]
  CREDIT_LIMIT    DECIMAL(12,2)                                // NULL means no credit
  ACCOUNT_STATUS  CHAR(1)         [enum: A S C D, default: A]
  CREATED_DATE    VARCHAR(10)                                  //! Stored as MM/DD/YYYY string
  LAST_MOD_DATE   VARCHAR(20)                                  //! MM/DD/YYYY HH:MM:SS AM/PM
  TAX_ID          VARCHAR(20)     [pii, encrypt]               //! Plaintext in legacy system
  LOYALTY_POINTS  INT             [default: 0]
  PREF_CONTACT    CHAR(1)         [enum: E P M N, default: E]
  NOTES           VARCHAR(MAX)
}
```

---

## 7. Fragment Blocks

Fragments are reusable partial schemas. They cannot be used as mapping endpoints — only spread into schema blocks.

```
fragment_block = "fragment" ident [string_literal] "{" schema_body "}"
```

Example:

```stm
fragment address_fields "Standard address structure" {
  line1        STRING(200)    [required]
  line2        STRING(200)
  city         STRING(100)    [required]
  state        STRING(50)
  postal_code  STRING(20)     [required]
  country      ISO-3166-a2    [required]
}

fragment audit_columns "Standard audit trail fields" {
  created_at   TIMESTAMPTZ    [required]
  created_by   VARCHAR(100)   [required]
  updated_at   TIMESTAMPTZ
  updated_by   VARCHAR(100)
}
```

---

## 8. Map Blocks

Map blocks define the transformation logic between source and target schemas. This is where STM's conciseness shines most — each mapping rule is typically a single line.

### 8.1 Syntax

```
map_block = "map" [ident "->" ident] "{" map_body "}"
map_body  = { note | map_entry | nested_map | comment }
```

### 8.2 Scoping Rules

**Implicit scoping (1:1):** When only one source and one target are in scope, the map block needs no qualifiers:

```stm
map {
  CUST_ID -> customer_id
}
```

Left-hand names resolve to the source. Right-hand names resolve to the target.

**Explicit scoping (N:M):** Name the source-target pair:

```stm
map crm_system -> analytics_db {
  customer_id -> customer_id
  email -> email
}

map payment_gateway -> analytics_db {
  amount -> total_spent
}
```

**Cross-schema override:** Within any map block, prefix a field with its schema ID to reference a different schema:

```stm
map crm_system -> notification_service {
  email -> recipient_email
  payment_gateway.status -> priority       // cross-reference
    : map { "failed": "high", _: "low" }
}
```

**Disambiguation rule:** A bare name resolves to the block's declared source (left) or target (right). If ambiguous (e.g., same field name in multiple sources), a parser error is raised and explicit qualification is required.

### 8.3 Mapping Types

#### Direct Mapping

Source field maps to target field, optionally with transformation:

```stm
source_field -> target_field
source_field -> target_field : transform_expr
```

#### Computed Mapping

Target field has no single source — it's calculated or static:

```stm
=> target_field : expression
=> target_field : "literal_value"
```

The `=>` operator signals "no direct source."

#### Lookup Mapping

Source field is used to look up a value from a reference table:

```stm
source_field -> target_field
  : lookup(resource_id, key_field => value_field)
  : lookup(resource_id, key_field => value_field, on_miss: error)
  : lookup(resource_id, key_field => value_field, on_miss: null)
  : lookup(resource_id, key_field => value_field, on_miss: "default_value")
```

### 8.4 Transform Expressions

Transforms modify data as it flows from source to target. They appear after `:` on a mapping line.

#### Pipe Chains

Functions composed left-to-right with `|`:

```stm
EMAIL_ADDR -> email : trim | lowercase | validate_email | null_if_invalid
```

#### Value Maps

Static lookup table for code-to-value conversions:

```stm
CUST_TYPE -> customer_type
  : map { R: "retail", B: "business", G: "government", null: "retail" }
```

The special key `_` is a wildcard/fallback:

```stm
STATUS -> status_text : map { A: "active", _: "unknown" }
```

#### Conditional (When) Expressions

Multi-branch conditional logic:

```stm
LOYALTY_POINTS -> loyalty_tier
  : when < 1000  => "bronze"
  : when < 5000  => "silver"
  : when < 10000 => "gold"
  : else            "platinum"
```

#### Arithmetic

Inline arithmetic operators:

```stm
CREDIT_LIMIT -> credit_limit_cents : coalesce(0) | * 100 | round
```

#### Natural Language Transforms

For complex business logic that is best expressed as intent:

```stm
PHONE_NBR -> phone
  : nl("Extract all digits. If 11 digits starting with 1, treat as US.
        If 10 digits, assume US country code. Format as E.164.
        If unparseable, set to null and log a warning.")
```

`nl()` blocks are treated as opaque by parsers and linters. They signal to AI agents and human implementers: "this transform requires interpretation and custom implementation." An `nl()` expression may be mixed with parseable transforms in a pipe chain:

```stm
NOTES -> notes
  : nl("Filter using the corporate profanity list, replacing matches with ***")
  | escape_html
  | truncate(5000)
```

#### Fallback Expression

Provides an alternative source when the primary is null:

```stm
LAST_MOD_DATE -> updated_at
  : parse("MM/DD/YYYY hh:mm:ss a") | to_utc
  : fallback CREATED_DATE | parse("MM/DD/YYYY") | assume_utc
```

#### Logic Expression

For computed fields with if/else logic:

```stm
=> display_name
  : if CUST_TYPE in (null, "R") then trim(FIRST_NM + " " + LAST_NM)
  : else trim(COMPANY_NM)
```

### 8.5 Standard Transform Functions

The following function names are reserved with standard semantics. Implementations should support them. Additional functions may be defined by tooling.

**String functions:**

| Function | Description |
|---|---|
| `trim` | Remove leading/trailing whitespace |
| `lowercase` | Convert to lowercase |
| `uppercase` | Convert to uppercase |
| `title_case` | Capitalize first letter of each word |
| `prepend(s)` | Prepend string |
| `append(s)` | Append string |
| `replace(old, new)` | Replace substring |
| `truncate(n)` | Limit to n characters |
| `max_length(n)` | Error/warn if exceeds n |
| `split(delim)` | Split string into array |
| `first` | First element of array/split |
| `last` | Last element of array/split |
| `escape_html` | Escape HTML special characters |
| `pad_left(n, char)` | Left-pad to n characters |
| `pad_right(n, char)` | Right-pad to n characters |

**Null/empty handling:**

| Function | Description |
|---|---|
| `coalesce(val)` | Replace null with value |
| `null_if_empty` | Convert empty string to null |
| `null_if_invalid` | Set to null if preceding validation fails |

**Validation functions:**

| Function | Description |
|---|---|
| `validate_email` | Check email format, pass through or flag |
| `to_e164` | Validate/convert phone to E.164 |
| `validate(pattern)` | Regex validation |

**Numeric functions:**

| Function | Description |
|---|---|
| `round` / `round(n)` | Round to n decimal places |
| `floor` / `ceil` | Floor/ceiling |
| `abs` | Absolute value |
| `to_number` | Parse string to number |
| `* N`, `/ N`, `+ N`, `- N` | Arithmetic |

**Date/time functions:**

| Function | Description |
|---|---|
| `parse(format)` | Parse date string with given format |
| `to_iso8601` | Format as ISO 8601 |
| `to_utc` | Convert to UTC |
| `assume_utc` | Declare timezone as UTC (no conversion) |
| `now_utc()` | Current UTC timestamp |

**Type conversion:**

| Function | Description |
|---|---|
| `to_string` | Convert to string |
| `to_number` | Convert to number |
| `to_boolean` | Convert to boolean |
| `uuid_v5(ns, name)` | Generate deterministic UUID |

**Encryption:**

| Function | Description |
|---|---|
| `encrypt(algo, key)` | Encrypt value |
| `decrypt(algo, key)` | Decrypt value |
| `hash(algo)` | One-way hash (sha256, etc.) |

### 8.6 Nested Array Mapping

When mapping arrays from source to target, use nested braces with relative paths:

```stm
map rest_api -> esb_xml {
  items[] -> OrderLines[] {
    => .LineNumber       : array_index + 1
    .sku -> .ProductCode : lookup(product_catalog, sku => internal_code, on_miss: error)
    .quantity -> .Qty
    .unitPrice -> .UnitPrice : round(2)
    => .LineTotal        : (.unitPrice * .quantity) * (1 - .discount / 100) | round(2)
  }
}
```

**Relative paths:** Inside a nested mapping block, `.fieldName` is relative to the current array element. This avoids repeating the full path.

**Nested nesting:** Array mappings may nest to arbitrary depth:

```stm
orders[] -> output_orders[] {
  .id -> .order_id
  .lines[] -> .line_items[] {
    .sku -> .product_id
    .variants[] -> .product_variants[] {
      .color -> .colour
    }
  }
}
```

**Grouping/aggregation:** When target arrays are grouped differently from source arrays, describe the grouping logic:

```stm
POReferences[] -> ShipmentHeader.asnDetails[] {
  note '''Aggregate items sharing the same PO number'''

  .REFNUM -> .orderNo : split("/") | first | to_number

  LineItems[] -> .items[] {
    .ITEMNO -> .item : trim
    Quantities[].QUANTITY -> .unitQuantity
      : nl("Divide by 10000 (4 implied decimals), multiply by PO pack size")
  }
}
```

### 8.7 Complete Example

```stm
map {
  note '''
    ## Mapping assumptions
    - All timestamps assume US Eastern unless noted
    - NULL handling: source NULLs preserved unless target has stated default
  '''

  // --- Identifiers ---
  CUST_ID -> customer_id        : uuid_v5("6ba7b810-...", CUST_ID)
  CUST_ID -> legacy_customer_id

  // --- Customer type ---
  CUST_TYPE -> customer_type    : map { R: "retail", B: "business", G: "government", null: "retail" }

  // --- Names ---
  => display_name
    : if CUST_TYPE in (null, "R") then trim(FIRST_NM + " " + LAST_NM)
    : else trim(COMPANY_NM)

  FIRST_NM   -> first_name     : trim | title_case | null_if_empty
  LAST_NM    -> last_name      : trim | title_case | null_if_empty
  COMPANY_NM -> company_name   : trim | null_if_empty

  // --- Contact ---
  EMAIL_ADDR -> email           : trim | lowercase | validate_email | null_if_invalid
  PHONE_NBR  -> phone           : nl("Normalize to E.164, assume US if ambiguous")

  // --- Financial ---
  CREDIT_LIMIT -> credit_limit_cents : coalesce(0) | * 100 | round

  // --- Status ---
  ACCOUNT_STATUS -> status      : map { A: "active", S: "suspended", C: "closed", D: "delinquent" }

  // --- Dates ---
  CREATED_DATE  -> created_at   : parse("MM/DD/YYYY") | assume_utc | to_iso8601
  LAST_MOD_DATE -> updated_at   : parse("MM/DD/YYYY hh:mm:ss a") | to_utc
                                  : fallback CREATED_DATE | parse("MM/DD/YYYY") | assume_utc

  // --- Security ---
  TAX_ID -> tax_identifier_encrypted : encrypt(AES-256-GCM, secrets.tax_key)

  // --- Calculated ---
  LOYALTY_POINTS -> loyalty_tier
    : when < 1000  => "bronze"
    : when < 5000  => "silver"
    : when < 10000 => "gold"
    : else            "platinum"

  PREF_CONTACT -> preferred_contact_method
    : map { E: "email", P: "phone", M: "mail", N: "none" }

  // --- Text ---
  NOTES -> notes                : nl("Filter profanity") | escape_html | truncate(5000)

  // --- Metadata ---
  => migration_timestamp        : now_utc()
}
```

---

## 9. Notes

Notes provide rich documentation at any level of the spec. They support markdown content.

### 9.1 Syntax

```stm
note '''
  Markdown content here.
  Supports **bold**, *italic*, `code`, lists, tables, links.
'''
```

### 9.2 Attachment Points

Notes may appear inside:

| Context | Meaning |
|---|---|
| `integration { ... }` | Project-level documentation |
| Schema block top level | Schema-level documentation |
| Group `{ ... }` | Group-level documentation |
| Field block `{ ... }` | Field-level documentation |
| `map { ... }` | Mapping-level documentation |

### 9.3 Multiple Notes

Multiple `note` blocks in the same scope are concatenated in order.

---

## 10. Formal Grammar

The following grammar is expressed in a PEG-like notation for use by parser generators. It is also compact enough (~500 tokens) to include in AI agent system prompts.

```ebnf
(* ======================================= *)
(* STM v1.0.0 — Formal Reference Grammar  *)
(* ======================================= *)

file             = { import_stmt | integration | block | fragment | map_block } ;

(* --- Imports --- *)
import_stmt      = "import" ( wildcard_import | named_import ) ;
wildcard_import  = STRING ;
named_import     = "{" ident_alias { "," ident_alias } "}" "from" STRING ;
ident_alias      = ident [ "as" ident ] ;

(* --- Integration --- *)
integration      = "integration" STRING "{" { integ_field | note | COMMENT } "}" ;
integ_field      = ident ( STRING | TOKEN | tag_list ) ;

(* --- Schema Blocks --- *)
block            = BLOCK_KW ident [ STRING ] "{" block_body "}" ;
BLOCK_KW         = "source" | "target" | "table" | "message"
                 | "record" | "event" | "schema" | "lookup" ;
block_body       = { annotation | note | field | group | spread
                   | sel_criteria | COMMENT } ;

fragment         = "fragment" ident [ STRING ] "{" block_body "}" ;

(* --- Fields --- *)
field            = IDENT type_expr [ tag_list ] [ field_block ] ;
field_block      = "{" note "}" ;
type_expr        = IDENT [ "(" params ")" ] ;
params           = param { "," param } ;
param            = NUMBER | STRING | IDENT ;

tag_list         = "[" tag { "," tag } "]" ;
tag              = IDENT [ ":" tag_value ] ;
tag_value        = STRING | NUMBER | IDENT { IDENT } ;

(* --- Groups --- *)
group            = IDENT [ "[]" ] "{" block_body "}" ;

(* --- Annotations --- *)
annotation       = "@" IDENT [ "(" params ")" ]
                 | "@" IDENT IDENT "=" STRING ;

(* --- Other Block Elements --- *)
spread           = "..." IDENT ;
sel_criteria     = "selection_criteria" MULTILINE_STRING ;
note             = "note" MULTILINE_STRING ;

(* --- Map Blocks --- *)
map_block        = "map" [ IDENT "->" IDENT ] "{" map_body "}" ;
map_body         = { note | map_entry | nested_map | COMMENT } ;

map_entry        = ( direct_map | computed_map ) { transform_line } ;
direct_map       = field_path "->" field_path ;
computed_map     = "=>" field_path ;
transform_line   = ":" transform_expr ;

nested_map       = field_path "->" field_path "{" map_body "}" ;

(* --- Transforms --- *)
transform_expr   = pipe_chain | nl_expr | when_chain | literal
                 | logic_expr | fallback_expr ;
pipe_chain       = xform_step { "|" xform_step } ;
xform_step       = IDENT [ "(" params ")" ]
                 | arith_op NUMBER
                 | "map" "{" map_pairs "}"
                 | nl_expr ;
arith_op         = "*" | "/" | "+" | "-" ;
nl_expr          = "nl(" STRING ")" ;
when_chain       = "when" condition "=>" value { NL ":" "when" condition "=>" value }
                   [ NL ":" "else" value ] ;
logic_expr       = "if" condition "then" expr { ":" "else" expr } ;
fallback_expr    = "fallback" field_path { "|" xform_step } ;

(* --- Paths --- *)
field_path       = [ IDENT "." ] path_segment { "." path_segment } ;
path_segment     = ( IDENT | BACKTICK_IDENT ) [ "[]" ] ;

(* --- Map Value Pairs --- *)
map_pairs        = map_pair { "," map_pair } ;
map_pair         = ( STRING | IDENT | "null" | "_" ) ":" ( STRING | IDENT | NUMBER ) ;

(* --- Terminals --- *)
IDENT            = LETTER { LETTER | DIGIT | "_" | "-" } ;
BACKTICK_IDENT   = "`" { ANY_CHAR | "``" } "`" ;
STRING           = '"' { ESCAPE_CHAR | CHAR } '"' ;
MULTILINE_STRING = "'''" { ANY_CHAR } "'''" ;
NUMBER           = [ "-" ] DIGIT+ [ "." DIGIT+ ] ;
TOKEN            = IDENT ":" IDENT ;          (* e.g., 1:1, N:M *)
COMMENT          = ( "//" | "//!" | "//?" ) TEXT_TO_EOL ;

LETTER           = [a-zA-Z] ;
DIGIT            = [0-9] ;
```

---

## 11. Validation Rules

Parsers and linters for STM v1.0.0 must enforce or check the following:

### 11.1 Errors (must reject)

| Rule | Description |
|---|---|
| **E001** | Schema IDs must be unique across all blocks (source, target, lookup, fragment) in scope (including imports) |
| **E002** | Schema IDs must match `^[a-zA-Z][a-zA-Z0-9_-]*$` |
| **E003** | All `source_field` paths in map blocks must resolve to a declared field in a source schema |
| **E004** | All `target_field` paths in map blocks must resolve to a declared field in a target schema |
| **E005** | Lookup resource IDs referenced in `lookup()` transforms must exist in a `lookup` block in scope |
| **E006** | Circular imports are forbidden |
| **E007** | Duplicate schema IDs across imports without aliasing |
| **E008** | Fragment blocks cannot be used as mapping endpoints (only spread) |
| **E009** | Backtick-quoted identifiers cannot be empty |
| **E010** | At most one `integration` block per file |

### 11.2 Warnings (should report)

| Rule | Description |
|---|---|
| **W001** | Declared `cardinality` doesn't match actual source/target count |
| **W002** | Target field marked `[required]` has no mapping entry and no `[default]` |
| **W003** | Source field declared but never referenced in any map block |
| **W004** | Target field declared but never referenced in any map block |
| **W005** | `nl()` transform used — implementation requires manual or AI interpretation |
| **W006** | Unresolved `//?` comments present (open questions/TODOs) |
| **W007** | Backtick-quoted identifier doesn't need quoting |
| **W008** | Direct mapping between incompatible types without explicit transform |

---

## 12. Project Configuration

An optional `stm.config` file at the project root provides project-wide settings:

```toml
[project]
name = "phoenix-migration"
default_spec_version = "1.0.0"

[paths]
# Path aliases for imports
"@lib"     = "./shared/lib"
"@schemas" = "./schemas"
"@lookups" = "./shared/lookups"

[lint]
# Customize warning levels
W003 = "off"          # Don't warn on unused source fields
W005 = "error"        # Treat nl() as error (require implementation)

[format]
indent = 2            # Spaces per indent level
max_line_length = 120
align_types = true    # Align type columns in schema blocks
align_tags = true     # Align tag columns in schema blocks
```

---

## 13. AI Agent Integration

This section provides resources specifically designed for AI/LLM consumption.

### 13.1 System Prompt Reference

The following compact cheat sheet (~400 tokens) is designed to be included in LLM system prompts for reliable STM generation:

````markdown
# STM Quick Reference (for AI agents)

## Schema blocks
source|target|message|table|event|lookup|schema <id> ["description"] {
  field_name    TYPE           [tags]       // info comment
  field_name    TYPE           [tags]       //! warning comment
  field_name    TYPE           [tags]       //? todo/question
  nested_obj {                              // nested object
    child_field TYPE
  }
  array_field[] {                           // array of objects
    item_field  TYPE
  }
  simple_arr[]  TYPE                        // array of primitives
  ...fragment_name                          // spread a fragment
}

## Tags:  [required, pk, unique, indexed, pii, encrypt, encrypt: AES-256-GCM,
##         default: val, enum: a b c, format: email, min: 0, max: 100,
##         pattern: "regex", ref: table.field]

## Annotations (on fields or groups):
##   @format xml|fixed-length|csv|edi|json
##   @xpath("path")  @pos(offset, length)  @header("Column Name")
##   @filter FIELD == "value"    @ns prefix = "uri"    @path "extraction.path"

## Map blocks
map [source_id -> target_id] {
  src_field -> tgt_field                     // direct
  src_field -> tgt_field : transform         // with transform
  => tgt_field : logic                       // computed (no source)
  => tgt_field : "literal"                   // static value

  // Transforms (combine with |):
  //   trim, lowercase, uppercase, title_case, null_if_empty, null_if_invalid
  //   coalesce(val), round(n), truncate(n), max_length(n)
  //   prepend("x"), append("x"), split("x") | first | last
  //   validate_email, to_e164, to_iso8601, to_utc, assume_utc, now_utc()
  //   pad_left(n, c), pad_right(n, c), replace(old, new), escape_html
  //   to_string, to_number, to_boolean, uuid_v5(ns, name)
  //   encrypt(algo, key), hash(algo)
  //   * N, / N, + N, - N
  //   map { src: "tgt", null: "default", _: "fallback" }
  //   lookup(resource, key => value [, on_miss: error|null|"default"])
  //   nl("natural language intent for complex transforms")
  //   when <cond> => "value" (multi-line conditionals)
  //   fallback field : chain (alternative when null)

  // Nested array mapping:
  src_arr[] -> tgt_arr[] {
    .child -> .child : transform             // relative paths with .
  }
}

## Other:
##   integration "name" { cardinality 1:1  author "x"  note '''...''' }
##   fragment <id> { fields... }   (spread with ...fragment_id)
##   import "file.stm"
##   import { id [as alias] } from "file.stm"
##   note '''multi-line markdown'''  (on any block)
##   // info  //! warning  //? question/todo
````

### 13.2 Recommended Agent Workflow

1. If available, read the STM grammar and cheat sheet from the system prompt
2. Generate STM output
3. Call `stm lint` to validate (if tooling is available)
4. Fix any errors and re-validate
5. When converting FROM Excel/free-text specs, use `nl()` liberally for any transform logic that is ambiguous or underspecified
6. Prefer explicit scoping (`map A -> B`) over implicit when multiple schemas are in scope

### 13.3 Common LLM Mistakes

| Mistake | Fix | Linter rule |
|---|---|---|
| Forgetting schema ID prefix in qualified paths | Use `schema_id.field` or implicit scoping | E003/E004 |
| Using `->` for computed fields (no source) | Use `=>` | Syntax error |
| Missing `[]` on array paths in nested maps | Add `[]` suffix to array groups | E003/E004 |
| Inventing transform functions not in stdlib | Use `nl()` for custom logic | W005 |
| Mixing up `//!` and `//` | `//!` for warnings, `//` for info | N/A |
| Putting transforms before `:` | Transform always follows `:` | Syntax error |
| Using `note` without triple quotes | Always `note '''...'''` | Syntax error |

### 13.4 Conversion from STM-YAML v3

When migrating existing STM-YAML files to STM:

| STM-YAML v3 | STM v1 |
|---|---|
| `source_schemas: { id: { type: object, properties: ... } }` | `source id { fields... }` |
| `target_schemas: { id: { ... } }` | `target id { fields... }` |
| `lookup_resources: { id: { ... } }` | `lookup id { fields... }` |
| `mapping_logic: [{ source: "a:x", target: "b:y" }]` | `map a -> b { x -> y }` |
| `transform: "description"` | `: transform_chain` or `: nl("description")` |
| `logic: "description"` | `=> field : nl("description")` |
| `type: "list_map"` with `children` | `src[] -> tgt[] { .child -> .child }` |
| `x-comment: { type: "warn", text: "..." }` | `//! ...` |
| `x-quality-rules: [...]` | Tags or notes |
| `x-metadata: { sensitivity: "PII" }` | `[pii]` tag |

---

## 14. Appendix: Canonical Examples

### 14.1 Database-to-Database Migration (1:1)

See Section 8.7 for the complete customer migration example.

### 14.2 REST API to ESB XML (1:1 with lookups)

```stm
import { country_codes, product_catalog } from "@lib/common-lookups.stm"

integration "Order_REST_to_ESB_XML" {
  cardinality 1:1
  author "Integration Team"
  note '''
    Transforms e-commerce REST API orders to ESB XML payload.
    Runs every 5 minutes via scheduled job.
    //! ESB expects ISO-8859-1 encoding.
  '''
}

source rest_api "E-commerce Order API" {
  orderId         UUID            [required]
  customerId      INT64           [required]
  orderDate       DATETIME        [required]
  customerEmail   EMAIL           [pii]
  shippingAddress {
    street        STRING(200)     [required]
    city          STRING(100)     [required]
    state         STRING(50)
    postalCode    STRING(20)      [required]
    country       ISO-3166-a2     [required, enum: US CA MX UK DE FR]
  }
  items[] {
    sku           STRING(8)       [required, pattern: "^[A-Z0-9]{8}$"]
    quantity      INT32           [required, min: 1]
    unitPrice     DECIMAL(10,2)
    discount      DECIMAL(5,2)    [default: 0.0]
  }
  paymentMethod   ENUM            [enum: CREDIT_CARD PAYPAL BANK_TRANSFER INVOICE, default: CREDIT_CARD]
  priority        ENUM            [enum: STANDARD EXPRESS OVERNIGHT, default: STANDARD]
}

target esb_xml "Legacy ESB Order XML Payload" {
  OrderHeader {
    OrderNumber       STRING      [required]   // Format: ORD-YYYYMMDD-NNNNNN
    CustomerCode      STRING(10)  [required]   // Left-padded with zeros
    OrderDateTime     DATETIME    [required]   // YYYY-MM-DD HH:MM:SS
    ContactEmail      EMAIL       [pii]
    ShipTo {
      AddressLine1    STRING      [required]
      AddressLine2    STRING      [default: ""]
      City            STRING      [required]
      StateProvince   STRING
      PostalCode      STRING      [required]
      CountryCode     STRING(3)   [required]   //! Source is alpha-2, must convert to alpha-3
    }
    PaymentType       ENUM        [enum: CC PP BT INV]
    ShippingPriority  INT         [enum: 1 2 3]
    TotalAmount       DECIMAL
  }
  OrderLines[] {
    LineNumber          INT       [required]
    ProductCode         STRING    [required]   // From product catalog lookup
    ProductDescription  STRING
    Quantity            INT       [required]
    UnitPrice           DECIMAL
    DiscountPercent     DECIMAL
    LineTotal           DECIMAL   [required]
  }
}

map {
  // --- Header ---
  orderId -> OrderHeader.OrderNumber
    : nl("Format as 'ORD-' + YYYYMMDD from orderDate + '-' + last 6 hex chars uppercase")

  customerId -> OrderHeader.CustomerCode      : to_string | pad_left(10, "0")
  orderDate  -> OrderHeader.OrderDateTime     : parse("ISO8601") | to_utc
  customerEmail -> OrderHeader.ContactEmail

  // --- Shipping ---
  shippingAddress.street     -> OrderHeader.ShipTo.AddressLine1
  => OrderHeader.ShipTo.AddressLine2          : ""
  shippingAddress.city       -> OrderHeader.ShipTo.City
  shippingAddress.state      -> OrderHeader.ShipTo.StateProvince : coalesce("")
  shippingAddress.postalCode -> OrderHeader.ShipTo.PostalCode    : replace(" ", "") | replace("-", "") | uppercase
  shippingAddress.country    -> OrderHeader.ShipTo.CountryCode
    : lookup(country_codes, alpha2 => alpha3, on_miss: error)

  // --- Payment & Priority ---
  paymentMethod -> OrderHeader.PaymentType
    : map { CREDIT_CARD: "CC", PAYPAL: "PP", BANK_TRANSFER: "BT", INVOICE: "INV" }

  priority -> OrderHeader.ShippingPriority
    : map { STANDARD: 1, EXPRESS: 2, OVERNIGHT: 3 }

  => OrderHeader.TotalAmount
    : nl("Sum of all items: (unitPrice * quantity * (1 - discount/100))")

  // --- Order Lines ---
  items[] -> OrderLines[] {
    => .LineNumber                             : array_index + 1
    .sku -> .ProductCode                       : lookup(product_catalog, sku => internal_code, on_miss: error)
    .sku -> .ProductDescription                : lookup(product_catalog, sku => description, on_miss: null)
    .quantity -> .Quantity
    .unitPrice -> .UnitPrice                   : round(2)
    .discount -> .DiscountPercent
    => .LineTotal                              : (.unitPrice * .quantity) * (1 - .discount / 100) | round(2)
  }
}
```

### 14.3 EDI to JSON (1:1 with filters)

```stm
integration "EDI_856_to_MFCS_Shipment" {
  cardinality 1:1
  author "Joao Marques"
  note '''
    Transforms EDI 856 (DESADV) fixed-length ASN messages to MFCS JSON.
    //! `containers` array required by target but has no source mapping.
  '''
}

message edi_desadv "EDI 856 Despatch Advice" {
  @format fixed-length

  BeginningOfMessage {
    DOCNUM      CHAR(35)                      // Despatch advice number
    MESSGFUN    CHAR(3)                       // 9 = Original
  }
  DateTime {
    DATEQUAL    CHAR(3)                       // 137 = Document date/time
    DATETIME    CHAR(35)
    DATEFMT     CHAR(3)                       // 102=CCYYMMDD, 203=CCYYMMDDHHMM
  }
  ShipmentRefs[] {
    @filter SHPRFQUAL == "SRN"
    SHPRFQUAL   CHAR(3)
    SHIPREF     CHAR(70)
  }
  POReferences[] {
    @filter REFQUAL == "ON"
    REFQUAL     CHAR(3)
    REFNUM      CHAR(35)                      // PO Number / Dissection No
  }
  LineItems[] {
    LINENUM     NUMBER(6)
    ITEMNO      CHAR(35)
    ITEMTYPE    CHAR(3)
  }
  Quantities[] {
    @filter QUANTQUAL == "12"
    QUANTITY    NUMBER(15)                    //! 4 implied decimals
  }
}

schema mfcs_json "MFCS Shipment Ingestion" {
  ShipmentHeader {
    toLocation   NUMBER(10)
    asnNo        STRING(30)     [required]
    shipDate     DATE           [required]
    comments     STRING(2000)
    asnType      STRING(1)      [required]
    supplier     NUMBER(10)     [required]
    asnDetails[] {
      orderNo    NUMBER(12)     [required]
      containers[] {
        containerId    STRING(30)   [required]    //! DATA GAP: no source
        finalLocation  NUMBER(10)   [required]    //! DATA GAP: no source
      }
      items[] {
        item           STRING(25)
        unitQuantity   NUMBER(12,4) [required]
      }
    }
  }
}

map edi_desadv -> mfcs_json {
  BeginningOfMessage.DOCNUM -> ShipmentHeader.asnNo : trim | max_length(30)

  DateTime.DATETIME -> ShipmentHeader.shipDate
    : nl("Parse using sibling DATEFMT: 102=CCYYMMDD, 203=CCYYMMDDHHMM. Output YYYY-MM-DD.")

  => ShipmentHeader.asnType                        : "0"

  POReferences[].REFNUM -> ShipmentHeader.supplier  : split("/") | first | to_number
  ShipmentRefs[].SHIPREF -> ShipmentHeader.comments : prepend("Shipment reference number: ")

  POReferences[] -> ShipmentHeader.asnDetails[] {
    .REFNUM -> .orderNo                             : split("/") | first | to_number

    LineItems[] -> .items[] {
      .ITEMNO -> .item                              : trim
      Quantities[].QUANTITY -> .unitQuantity
        : nl("Divide by 10000 (4 implied decimals), multiply by PO pack size (Action A-504)")
    }
  }

  //! DATA GAP: containers[] required but unmapped — needs warehouse team input
  => ShipmentHeader.asnDetails[].containers
    : nl("Required by schema but no source data. Awaiting clarification.")
}
```

### 14.4 Multi-Source Multi-Target Hub (N:M)

```stm
integration "Multi_Source_Data_Hub" {
  cardinality N:M
  author "Integration Team"
}

source crm_system "CRM customer data" {
  customer_id     UUID
  email           EMAIL
  phone           STRING(20)
  loyalty_points  INT32
}

source payment_gateway "Payment transaction data" {
  transaction_id  UUID
  customer_email  EMAIL
  amount          DECIMAL(12,2)
  currency        ISO-4217
  status          ENUM          [enum: pending completed failed]
}

source inventory_system "Inventory management" {
  product_sku          STRING(20)
  stock_level          INT32
  warehouse_location   STRING(50)
}

target analytics_db "Analytics database" {
  customer_id          UUID
  email                VARCHAR(255)
  total_spent          DECIMAL(12,2)
  transaction_count    INT
  last_transaction_date TIMESTAMPTZ
}

target notification_service "Notification messages" {
  recipient_email  EMAIL
  recipient_phone  STRING(20)
  message_type     ENUM
  message_body     TEXT
  priority         ENUM          [enum: low medium high]
}

target reporting_warehouse "Reporting data warehouse" {
  product_id       VARCHAR(20)
  available_stock  INT
  location         VARCHAR(50)
  reorder_needed   BOOLEAN
}

// --- Each map block names its source->target pair ---

map crm_system -> analytics_db {
  customer_id -> customer_id
  email -> email
}

map payment_gateway -> analytics_db {
  amount -> total_spent                     : nl("Sum all completed transactions per customer")
  => transaction_count                      : nl("Count completed transactions per customer")
}

map crm_system -> notification_service {
  email -> recipient_email
  phone -> recipient_phone
  => message_type                           : if loyalty_points > 1000 then "loyalty_update" else null
  // Cross-source reference:
  => priority                               : if payment_gateway.status == "failed" then "high" else "low"
}

map payment_gateway -> notification_service {
  customer_email -> recipient_email
  transaction_id -> message_body            : nl("Format as 'Transaction {id} completed'")
}

map inventory_system -> reporting_warehouse {
  product_sku -> product_id
  stock_level -> available_stock
  warehouse_location -> location
  => reorder_needed                         : if stock_level < 10 then true else false
}
```

---

## 15. Future Extensions (Planned)

The following features are under consideration for future versions:

- **`$ref` support:** External schema references for very large schemas (v1.1)
- **`x-codegen` hints:** Mapping transform functions to specific library calls in Python/Java/etc. (v1.1)
- **Conditional routing:** Route to different targets based on source data value for 1:N fan-out scenarios (v1.2)
- **Transform function definitions:** User-defined reusable transforms (v1.2)
- **Schema inheritance:** Extend/override an existing schema block (v1.2)
- **Bidirectional mapping:** Declare forward and reverse transforms in a single block (v2.0)
- **Test fixtures:** Inline sample data with expected output for validation (v2.0)

---

## Changelog

### v1.0.0 (2026-03-13)

- Initial release
- Schema blocks with nested objects and arrays
- Map blocks with implicit and explicit scoping
- Transform pipe chains and standard function library
- `nl()` natural language transforms
- Fragment composition with spread syntax
- Import system with wildcard, named, and aliased imports
- Three-tier annotation system (inline comments, notes, field blocks)
- Physical format annotations (@format, @xpath, @pos, @filter, @header, @ns, @path)
- Backtick-quoted identifiers
- AI agent integration section with grammar and cheat sheet
