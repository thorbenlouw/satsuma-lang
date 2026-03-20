# ISO 8583 Conventions

## Why This Format is Difficult

ISO 8583 is the international standard for card payment messages. It underpins ATM transactions, point-of-sale authorisations, and inter-network settlement. The format is challenging because:

- **Bitmap-driven structure** — field presence is indicated by bits in a bitmap header, not by position or delimiters
- **Numeric field identifiers** — fields are referred to as "data elements" (DE2, DE3, ..., DE128) with no human-readable names in the wire format
- **Variable-length fields** — some fields have fixed lengths, others are prefixed with length indicators (LLVAR, LLLVAR)
- **Encoding diversity** — fields may be ASCII, EBCDIC, BCD-packed, or binary, sometimes within the same message
- **Network dialects** — Visa, Mastercard, and regional networks each define their own variants with different field semantics, sub-fields, and private data elements

Without domain knowledge, an ISO 8583 message is essentially unreadable.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `iso8583` | `format iso8583` |
| `version` | ISO 8583 version | `version "1987"` or `version "1993"` |
| `network` | Network dialect if applicable | `network visa` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `de` | Data element number | `de 2` |
| `length` | Field length or max length | `length 19` |
| `length_type` | Fixed, LLVAR, or LLLVAR | `length_type llvar` |
| `encoding` | Field-level encoding | `encoding bcd` |
| `bitmap` | Bitmap position (if different from DE number) | `bitmap 1` |

### Guidelines

- Always include `de` on every field — this is the canonical identifier that domain engineers will look for
- Use human-readable field names alongside the DE number (e.g., `PAN` not `DE2`, with `de 2` in metadata)
- Include `length_type` to distinguish fixed from variable-length fields — this is critical for parsing
- Document network-specific semantics in `note` — the same DE can mean different things on different networks

## How Natural Language Helps

- **MTI interpretation** — "0100 = authorisation request, 0110 = authorisation response" — the message type indicator encodes transaction semantics in a 4-digit code
- **Sub-field parsing** — "DE-3 processing code: positions 1-2 = transaction type, 3-4 = from account, 5-6 = to account"
- **Network-specific behaviour** — "On Visa, DE-48 contains TLV-encoded subelements; on Mastercard, it's a fixed structure"
- **Bitmap mechanics** — "If bit 1 of the primary bitmap is set, a secondary bitmap follows, enabling DE-65 through DE-128"

## Example

```stm
// Satsuma v2 — ISO 8583 Authorisation Request (simplified)

schema iso8583_auth_request (format iso8583, version "1987",
  note "Card authorisation request — common fields across networks"
) {
  MTI              STRING     (length 4, encoding bcd,
    note "Message Type Indicator: 0100 = auth request, 0110 = auth response"
  )

  BITMAP           BINARY     (length 8,
    note "Primary bitmap — each set bit indicates the presence of the corresponding DE"
  )

  PAN              STRING     (de 2, length 19, length_type llvar, pii,
    note "Primary Account Number — variable length, up to 19 digits"
  )

  PROCESSING_CODE  STRING     (de 3, length 6, encoding bcd,
    note """
    6-digit code:
    - Positions 1-2: transaction type (00=purchase, 01=cash advance)
    - Positions 3-4: from account type (00=default, 10=savings)
    - Positions 5-6: to account type
    """
  )

  AMOUNT           INTEGER    (de 4, length 12, encoding bcd,
    note "Transaction amount in minor units of the transaction currency"
  )

  TRANSMISSION_DT  STRING     (de 7, length 10, encoding bcd,
    note "MMDDhhmmss — date and time of transmission"
  )

  TRACE_NUMBER     STRING     (de 11, length 6,
    note "Systems trace audit number — unique per transaction within a day"
  )

  EXPIRY_DATE      STRING     (de 14, length 4, encoding bcd, pii,
    note "YYMM format"
  )

  CURRENCY_CODE    STRING     (de 49, length 3,
    note "ISO 4217 numeric currency code"
  )

  record ADDITIONAL_DATA (de 48, length_type lllvar,
    note "Network-specific: contains TLV sub-elements on Visa, fixed structure on Mastercard"
  ) {
    //? Structure varies by network — document per-network sub-fields as needed
  }
}
```

### Key patterns

- **DE numbers as canonical identifiers.** Every field carries `de N`, matching the ISO 8583 standard numbering. Field names are human-readable aliases.
- **Length type matters.** `length_type llvar` vs fixed length is critical for wire-format parsing.
- **Sub-field semantics via NL.** DE-3's positional sub-fields are explained in a `note` rather than decomposed into separate fields — matching how the standard documents them.
- **Network variance acknowledged.** The `ADDITIONAL_DATA` record uses a question comment (`//?`) to flag that its structure depends on the network.
