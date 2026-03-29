# EDI Conventions (EDIFACT / ODETTE / TRADACOMS)

## Why This Format is Difficult

EDI (Electronic Data Interchange) predates XML, JSON, and the web. Messages are compact, positional, and qualifier-driven — and they remain the backbone of supply chain, logistics, and retail B2B communication worldwide. The three major standards in this family share a common design philosophy but differ in segment naming, delimiter conventions, and industry adoption:

- **UN/EDIFACT** — the international standard used across Europe, Asia, and global logistics. Message types like DESADV (despatch advice), ORDERS (purchase order), and INVOIC (invoice) are ubiquitous in cross-border trade.
- **ODETTE** — an automotive-industry profile of EDIFACT used by European vehicle manufacturers and their supply chains. Same segment structure, tighter field constraints, industry-specific qualifiers.
- **TRADACOMS** — a UK-specific standard predating EDIFACT, still used by British retailers and suppliers. Different segment names and delimiters, but the same qualifier-driven logic.

All three share the same fundamental challenges:

- **Qualifier-driven segments** — the same segment type appears multiple times in a message, with a qualifier field determining which instance means what. A `RFF` (reference) segment with qualifier `ON` is a purchase order number; with qualifier `SRN` it is a shipment reference. Without the qualifier, the data is ambiguous.
- **Implied decimals** — numeric fields often carry implied decimal places (e.g., a quantity of `150000` with 4 implied decimals means `15.0000`). The decimal position is not in the data; it is in the implementation guide.
- **Positional correlation** — related segments (e.g., line items and their quantities) are correlated by position in the message, not by explicit keys. Item 3's quantity is the third QTY segment, not a QTY with `item_id=3`.
- **Hierarchical grouping** — segments group into logical blocks (e.g., header, detail lines, summary) but the grouping is implicit in segment ordering, not delimited.
- **Fixed-length vs delimited** — EDIFACT uses delimiter-separated elements; TRADACOMS and some legacy EDIFACT implementations use fixed-length fields. The same logical message can arrive in either physical format.

Traditional schema languages cannot express qualifier filters, implied decimals, or positional correlation. Satsuma handles all three.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Physical format of the message | `format fixed-length` or `format edifact` |
| `note` | Message type and version context | `note "EDI 856 Despatch Advice — Fixed Length"` |

### Field and record-level

| Token | Usage | Example |
|-------|-------|---------|
| `filter` | Qualifier-based segment selection | `filter REFQUAL == "ON"` |
| `note` | Implied decimal rules, correlation logic | `note "4 implied decimal places"` |

### Guidelines

- Use `filter` on `list_of record` to select qualifier-driven segments. This is the key pattern — it models the fact that a list of `RFF` segments contains mixed reference types, and you only want the ones matching a specific qualifier.
- Document implied decimals with `//!` warning comments or `note` metadata. The decimal position is critical for correct interpretation and easy to miss.
- Use `each` blocks in mappings to handle positional correlation between segment types. The `each` / `.field` pattern maps naturally to "for each PO reference, take the corresponding line items."
- Use `record` (not `list_of record`) for segments that appear exactly once (e.g., `BeginningOfMessage`, `DateTime`).
- Document message function codes and qualifier values in comments or notes — they are the key to understanding what the message means.

## How Natural Language Helps

EDI is the format where the gap between the physical data and the business meaning is widest. Natural language fills that gap in Satsuma:

- **Qualifier decoding** — "Qualifier `ON` = purchase order number, `SRN` = shipment reference, `AAU` = despatch advice number" — the qualifier codes are terse and domain-specific.
- **Implied decimal conversion** — "Divide by 10000 to account for 4 implied decimal places, then multiply by pack size from the PO" — this is business logic that cannot be expressed structurally.
- **Cross-reference lookups** — "Retrieve MFCS item number using the supplier's traded code from the supplier item cross-reference" — EDI fields often need resolution against a master data system.
- **Positional correlation rules** — "Line items and quantities are correlated by position" — the structural relationship is implicit in the message stream.
- **Data gaps and open issues** — EDI mappings routinely have fields required by the target but absent from the source. NL transforms and `//!` comments document these gaps explicitly.

## The `filter` Pattern for Qualifiers

The most important Satsuma pattern for EDI is `filter` on `list_of record`. In an EDI message, the same segment type repeats with different qualifier values. In Satsuma, you model this as a filtered list:

```satsuma
// All reference segments in the message
// filter selects only the purchase order references
POReferences list_of record (filter REFQUAL == "ON") {
  REFQUAL  CHAR(3)
  REFNUM   CHAR(35)  // PO Number + "/" + Dissection No
}

// Same segment type, different qualifier → different list
ShipmentRefs list_of record (filter SHPRFQUAL == "SRN") {
  SHPRFQUAL  CHAR(3)
  SHIPREF    CHAR(70)
}
```

This is how Satsuma handles the qualifier-driven nature of EDI without introducing an EDI-specific keyword. The `filter` token is general-purpose — it works the same way for EDI qualifiers, status-based row selection, or any other predicate on a repeated structure.

### Quantity qualifiers

Quantity segments are another common use of the `filter` pattern:

```satsuma
// Only despatch quantities (qualifier 12), not ordered or invoiced
Quantities list_of record (filter QUANTQUAL == "12") {
  QUANTQUAL  CHAR(3)
  QUANTITY   NUMBER(15)  //! 4 implied decimal places
}
```

## Positional Correlation with `each`

When EDI line items and their associated segments are correlated by position, use `each` blocks in mappings:

```satsuma
each POReferences -> ShipmentHeader.asnDetails (
  note "Each PO reference generates one asnDetails entry.
        Line items and quantities are correlated by position."
) {
  .REFNUM -> .orderNo { split("/") | first | to_number }

  LineItems -> .items {
    .ITEMNO -> .item {
      trim
      | "Retrieve item number via supplier cross-reference"
    }

    Quantities.QUANTITY -> .unitQuantity {
      "Divide by 10000 (4 implied decimals),
       multiply by PO pack size from master data"
    }
  }
}
```

The `each` block iterates over PO references; the nested arrows map the associated line items and quantities. The `.` prefix references fields relative to the current iteration context.

## EDIFACT vs ODETTE vs TRADACOMS

The metadata conventions above apply to all three standards. The differences are in the segment names, qualifier codes, and field lengths:

| Aspect | EDIFACT | ODETTE | TRADACOMS |
|--------|---------|--------|-----------|
| Despatch advice | DESADV | DESADV (same) | DNOTE |
| Purchase order | ORDERS | ORDERS (same) | ORDHDR / ORDDET |
| Delimiter | `+` element, `:` component | Same as EDIFACT | `=` segment, `+` element |
| Reference qualifier | RFF with qualifier | RFF with qualifier | RFRF with qualifier |
| Implied decimals | Common (4 places) | Common (4 places) | Less common |
| Format keyword | `format edifact` | `format edifact` | `format tradacoms` |

Use the `note` on the schema to identify which standard and version the message follows. The qualifier values and segment names differ, but the Satsuma patterns (`filter`, `each`, NL transforms for implied decimals) are the same.

## Example

The canonical example [`examples/edi-to-json/pipeline.stm`](../../../examples/edi-to-json/pipeline.stm) demonstrates all of these patterns in a real-world EDI 856 (DESADV) to warehouse JSON mapping:

- `filter` on `ShipmentRefs`, `POReferences`, and `Quantities` for qualifier selection
- `each` for positional correlation between PO references and line items
- NL transforms for implied decimal conversion and cross-reference lookups
- `//!` comments and `note` blocks for data gaps (required target fields with no source mapping)
- `format fixed-length` on the source schema
