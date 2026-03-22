# Lesson 07 — Nested Data, Arrays, and Complex Shapes

## Real Data Is Nested

The flat field-to-field mappings from previous lessons work for database tables. But real integration projects involve:

- **JSON APIs** with deeply nested objects and arrays
- **XML messages** with repeated elements and namespaces
- **EDI documents** with hierarchical segment groups
- **Protobuf events** with nested repeated fields

Satsuma handles all of these with the same structural primitives: dotted paths, `record`, `list`, `[]` array notation, and nested arrow blocks.

---

## Dotted Paths

When source or target schemas have nested structures, arrows use dotted paths to reach into them:

```stm
Order.Customer.Email -> customer_email { trim | lowercase }
Order.Totals.TotalAmount -> total_amount
Order.ShippingAddress.CountryCode -> ship_country { trim | uppercase }
```

Each segment of the path corresponds to a `record` or `list` in the schema. The path `Order.Customer.Email` means: inside the `Order` record, inside the `Customer` record, the `Email` field.

---

## Backtick Identifiers for Special Names

When field names contain spaces, dots, or other special characters, wrap them in backticks:

```stm
`Order Header`.`PO Number` -> po_number
```

Backticks are also used for schema references in `source { }` and `target { }` blocks:

```stm
source { `edi_desadv` }
target { `mfcs_json` }
```

---

## Array Notation: `[]`

The `[]` suffix marks an array/list traversal:

```stm
Order.LineItems[] -> order_lines[]
```

This means: for each item in the `LineItems` list, produce a corresponding item in the `order_lines` list.

---

## Nested Arrow Blocks

When mapping arrays, the child field mappings go inside a nested arrow block:

```stm
POReferences[] -> ShipmentHeader.asnDetails[] (
  note "Each PO reference generates one asnDetails entry."
) {
  .REFNUM -> .orderNo { split("/") | first | to_number }

  LineItems[] -> .items[] {
    .ITEMNO -> .item { trim }

    Quantities[].QUANTITY -> .unitQuantity {
      "Divide by 10000 for 4 implied decimal places.
       Multiply by PO pack size from MFCS."
    }
  }
}
```

### Relative paths with `.field`

Inside a nested arrow block, `.field` refers to a field relative to the current array element:

- `.REFNUM` → the `REFNUM` field of the current `POReferences` element
- `.orderNo` → the `orderNo` field of the current `asnDetails` element
- `.item` → the `item` field of the current `items` element

This keeps paths short and readable. Without the `.` prefix, the path would be absolute from the schema root.

### Nesting depth

Nested arrow blocks can nest to any depth. In the example above:

1. `POReferences[]` → `ShipmentHeader.asnDetails[]` — top-level array mapping
2. Inside that: `LineItems[]` → `.items[]` — second-level array mapping
3. Inside that: `Quantities[].QUANTITY` → `.unitQuantity` — referencing a sibling array

The agent handles the mechanical work of producing correct path expressions. You focus on whether the nesting makes business sense: *"Does each PO reference really produce one shipment detail entry?"*

---

## Flattening: One Row Per Array Element

Sometimes you want to flatten a nested source into a flat target (one row per array element). Use the `flatten` metadata on the mapping:

```stm
mapping 'order lines' (flatten `Order.LineItems[]`) {
  source { `commerce_order` }
  target { `order_lines_parquet` }

  Order.OrderId -> order_id
  Order.LineItems[].LineNumber -> line_number
  Order.LineItems[].SKU -> sku { trim | uppercase }
  Order.LineItems[].Quantity -> quantity
  Order.LineItems[].UnitPrice -> unit_price

  // Parent-level fields repeated on every row
  Order.CurrencyCode -> currency_code { trim | uppercase }
  Order.Channel -> order_channel { trim | lowercase }
  Order.Customer.CustomerId -> customer_id
}
```

The `flatten` directive tells downstream tools that this mapping produces one output row per element in `Order.LineItems[]`. Parent-level fields (like `OrderId`, `CurrencyCode`) are denormalized onto every row.

---

## Format-Specific Nesting

Different data formats express nesting differently. Satsuma captures the format-specific details in metadata while keeping the structural model consistent:

### XML with namespaces and XPath

```stm
schema commerce_order (
  format xml,
  namespace ord "http://example.com/commerce/order/v2",
  namespace com "http://example.com/common/v1"
) {
  record Order (xpath "/ord:OrderMessage/ord:Order") {
    OrderId       STRING   (xpath "ord:OrderId")
    Channel       STRING   (xpath "ord:Channel")

    record Customer {
      CustomerId  STRING   (xpath "ord:CustomerId")
      Email       STRING   (xpath "ord:Email")
    }

    list LineItems (xpath "ord:LineItems/ord:LineItem") {
      LineNumber  INT32    (xpath "ord:LineNumber")
      SKU         STRING   (xpath "ord:SKU")
      Quantity    INT32    (xpath "ord:Quantity")
    }
  }
}
```

The `xpath` metadata captures how to navigate the XML document. The `record`/`list` structure captures the logical shape. Format metadata and structural modeling work together.

### EDI with filters

```stm
schema edi_desadv (format fixed-length) {
  list POReferences (filter REFQUAL == "ON") {
    REFQUAL   CHAR(3)
    REFNUM    CHAR(35)
  }

  list Quantities (filter QUANTQUAL == "12") {
    QUANTQUAL CHAR(3)
    QUANTITY  NUMBER(15)    //! 4 implied decimal places
  }
}
```

EDI segments are filtered by qualifier values. The `filter` metadata on `list` declares which segment instances this list captures. Only segments where `REFQUAL == "ON"` become `POReferences` entries.

---

## Records and Lists in Target Schemas

Target schemas use the same `record`/`list` nesting:

```stm
schema mfcs_json (format json) {
  record ShipmentHeader {
    asnNo        STRING(30)   (required)
    shipDate     DATE         (required)
    supplier     NUMBER(10)   (required)

    list asnDetails {
      orderNo    NUMBER(12)   (required)

      list items {
        item          STRING(25)
        unitQuantity  NUMBER(12,4) (required)
      }
    }
  }
}
```

The target schema defines the expected output shape. The mapping's nested arrows must match this shape — array-to-array, record-to-record.

---

## How the Agent Helps with Complex Shapes

Nested mappings are where the agent earns its keep. The mechanical work of:

- Producing correct dotted paths through deeply nested schemas
- Matching source arrays to target arrays
- Using relative paths (`.field`) inside nested blocks
- Keeping track of which nesting level you're at

...is tedious and error-prone for humans but straightforward for an agent that can read the schema structure.

Your role is to validate the **business logic**:

- Does each source array element map to exactly one target element, or is there aggregation?
- Are parent fields correctly denormalized when flattening?
- Do filter conditions on source lists capture the right segments?
- Are data gaps (missing source data for required target fields) documented?

---

## Exercise: Reading a Nested Mapping

Look at this mapping from the EDI-to-JSON example:

```stm
POReferences[] -> ShipmentHeader.asnDetails[] {
  .REFNUM -> .orderNo { split("/") | first | to_number }

  LineItems[] -> .items[] {
    .ITEMNO -> .item {
      trim
      | "Retrieve MFCS item number using the supplier's traded code."
    }

    Quantities[].QUANTITY -> .unitQuantity {
      "Divide by 10000 for 4 implied decimal places.
       Multiply by PO pack size from MFCS."
    }
  }
}
```

Without memorizing syntax, you should be able to see:

1. Each PO reference becomes one `asnDetails` entry.
2. The PO number is extracted from `REFNUM` by splitting on `/` and taking the first part.
3. Line items are mapped into the `items` array within each `asnDetails`.
4. Item numbers require a cross-reference lookup (NL transform).
5. Quantities need decimal adjustment and pack-size multiplication (NL transform).

The structure tells you the shape. The NL tells you the business logic. Together, they give you a complete picture.

---

## Key Takeaways

1. **Dotted paths** navigate nested structures: `Order.Customer.Email`.
2. **`[]`** marks array traversal: `LineItems[]` means "for each element."
3. **Nested arrow blocks** map arrays with child fields inside `{ }`.
4. **Relative paths** (`.field`) keep nested mappings concise.
5. **`flatten`** on a mapping produces one flat row per array element.
6. Format-specific details (`xpath`, `filter`, `namespace`) go in metadata, not in the structural model.
7. The agent handles path mechanics. You validate business logic.

---

**Next:** [Lesson 08 — The Satsuma CLI as the Agent's Toolkit](08-satsuma-cli.md) — how the CLI provides exact structural facts that the agent composes into workflows.
