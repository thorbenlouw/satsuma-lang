# COBOL Copybook Conventions

## Why This Format is Difficult

COBOL copybooks are memory layouts disguised as schemas. They remain ubiquitous in finance, insurance, and government systems, but present several challenges for modern tooling:

- **Positional layout** — fields are defined by byte offset and length, with no delimiters
- **PIC clauses** — type, precision, and display format compressed into a terse notation (`PIC S9(7)V99`)
- **Packed decimals (COMP-3)** — binary nibble encoding where each byte holds two digits and the final nibble is a sign indicator
- **REDEFINES** — the same bytes can represent entirely different structures depending on runtime context
- **OCCURS** — fixed-size arrays that may be partially populated, sometimes with a dynamic count via `DEPENDS ON`
- **FILLER** — padding bytes that occupy physical space but carry no semantic meaning
- **External interpretation** — the rules for choosing between REDEFINES variants or determining how many OCCURS entries are valid often live outside the copybook entirely

Traditional schema languages either lose the physical layout detail (JSON Schema, Avro) or cannot express the interpretation rules (XSD, DDL).

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `copybook` | `format copybook` |
| `encoding` | Character encoding of the source file | `encoding ebcdic` |
| `note` | Context about the record's origin or system | `note "Customer master from VSAM"` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `pic` | Original COBOL PIC clause, quoted | `pic "S9(7)V99"` |
| `offset` | Byte offset (1-based) in the record | `offset 31` |
| `length` | Field length in bytes | `length 5` |
| `encoding` | Field-specific encoding (for packed fields) | `encoding comp-3` |
| `occurs` | Repetition count (on `list`) | `occurs 5` |
| `depends_on` | Dynamic OCCURS count field | `depends_on ITEM_COUNT` |
| `redefines` | Names the record this one aliases | `redefines DATA_BLOCK` |

### Guidelines

- Always quote the `pic` value — it contains parentheses that would conflict with metadata syntax
- Include `offset` and `length` on every field to make the physical layout reconstructible
- Use `encoding comp-3` on packed decimal fields, with a `note` explaining sign-nibble conventions if the audience may not know them
- Represent FILLER fields explicitly with a `note` marking them as padding — do not silently omit them, as this breaks offset calculations

## How Natural Language Helps

Copybooks are the format where natural language adds the most value in Satsuma. The key interpretation rules that NL captures:

- **REDEFINES resolution** — "If RECORD_TYPE = 'P', interpret these bytes as CARD_PAYMENT" — this conditional logic has no structural home in a schema
- **OCCURS population rules** — "Only the first N entries are valid; trailing entries have blank ITEM_CODE" — the schema says 5 slots, reality says fewer
- **Packed decimal details** — "Last nibble is sign: C = positive, D = negative" — critical for correct decoding
- **Business meaning** — mapping status codes, explaining field overloading, documenting system-specific quirks

These rules belong in `" "` descriptions within mapping blocks, not forced into metadata tokens.

## Example

```stm
// Satsuma v2 — COBOL Customer Master Record

schema cobol_customer (format copybook, encoding ebcdic,
  note "Customer master record from mainframe VSAM file"
) {
  CUST_ID        INTEGER    (pic "9(10)", offset 1, length 10, required)
  CUST_TYPE      STRING     (pic "X(1)", offset 11, enum {R, B})

  record NAME (offset 12, length 40) {
    FIRST_NAME   STRING     (pic "X(20)", offset 12)
    LAST_NAME    STRING     (pic "X(20)", offset 32)
  }

  record ADDRESS (offset 52, length 57) {
    STREET       STRING     (pic "X(30)", offset 52)
    CITY         STRING     (pic "X(20)", offset 82)
    STATE        STRING     (pic "X(2)", offset 102)
    ZIP          INTEGER    (pic "9(5)", offset 104)
  }

  CREDIT_LIMIT   DECIMAL(9,2) (
    pic "S9(7)V99",
    encoding comp-3,
    offset 109,
    length 5,
    note "Packed decimal: last nibble is sign (C=positive, D=negative)"
  )

  ACCOUNT_BAL    DECIMAL(9,2) (
    pic "S9(7)V99",
    encoding comp-3,
    offset 114,
    length 5
  )

  STATUS_CODE    STRING     (pic "X(1)", offset 119, enum {A, I, S})

  FILLER         STRING     (pic "X(10)", offset 120, length 10,
    note "Unused padding — ignore in downstream systems"
  )
}
```

## Advanced: REDEFINES and OCCURS

REDEFINES and OCCURS are the constructs that make copybooks genuinely difficult. Here is a record that uses both:

```stm
schema cobol_transaction (format copybook, encoding ebcdic,
  note "Transaction record with polymorphic payload and repeating line items"
) {
  RECORD_TYPE   STRING     (pic "X(1)", offset 1)
  ACCOUNT_ID    INTEGER    (pic "9(10)", offset 2)

  record DATA_BLOCK (offset 12, length 11) {
    AMOUNT      DECIMAL(9,2) (pic "S9(7)V99", encoding comp-3, offset 12, length 5)
    CURRENCY    STRING       (pic "X(3)", offset 17)
  }

  record CARD_PAYMENT (redefines DATA_BLOCK, offset 12,
    note "Interpreted when RECORD_TYPE = 'P'"
  ) {
    CARD_NUMBER STRING     (pic "X(16)", offset 12)
    EXPIRY_DATE STRING     (pic "9(6)", offset 28)
  }

  ITEM_COUNT    INTEGER    (pic "9(2)", offset 34)

  list LINE_ITEMS (occurs 10, depends_on ITEM_COUNT,
    note "Only the first ITEM_COUNT entries are populated"
  ) {
    ITEM_CODE   STRING     (pic "X(10)")
    QUANTITY    INTEGER    (pic "9(3)")
    UNIT_PRICE  DECIMAL(7,2) (pic "S9(5)V99", encoding comp-3)
  }
}
```

### Key patterns

- **REDEFINES as explicit variant.** The `redefines` token makes the aliasing visible. The `note` on the record states the discriminator condition.
- **OCCURS with `depends_on`.** The physical capacity (10 slots) is separate from the logical count (`ITEM_COUNT`). The `note` explains population semantics.
- **Resolution belongs in mappings.** A mapping that consumes this schema would use `->` arrows with NL descriptions like `"If RECORD_TYPE = 'P', interpret DATA_BLOCK as CARD_PAYMENT"`.
