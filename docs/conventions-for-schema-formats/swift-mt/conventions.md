# SWIFT MT Conventions

## Why This Format is Difficult

SWIFT MT (Message Type) messages are the legacy standard for international financial messaging. MT103 (single customer credit transfer) is the most common. The format is challenging because:

- **Block structure** — messages are divided into numbered blocks (1-5), each with different syntax rules
- **Tag-based fields** — within the text block, fields are identified by tags like `:20:`, `:32A:`, `:59:`
- **Composite text fields** — a single tag can contain multiple semantic elements separated by line breaks or positional conventions (e.g., `:32A:` encodes date + currency + amount in one field)
- **Free-text conventions** — some fields (like `:70:` remittance info) are semi-structured text with implied sub-fields
- **Legacy interpretation** — banking conventions accumulated over decades determine how fields are parsed, validated, and routed

SWIFT MT is being gradually replaced by ISO 20022 XML, but remains in widespread production use.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `swift_mt` | `format swift_mt` |
| `message_type` | MT number | `message_type "103"` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `tag` | SWIFT field tag | `tag "32A"` |
| `block` | Block number (1-5) | `block 2` |
| `status` | Mandatory/Optional per SWIFT spec | `status mandatory` |

### Guidelines

- Use `tag` on every field in the text block — this is how SWIFT engineers identify fields
- Use `record` for composite tags that contain multiple semantic values (e.g., `:32A:` → date + currency + amount)
- Document sub-field parsing in `note` — the positional rules within a tag are rarely obvious
- Represent the block structure explicitly when the full message envelope matters

## How Natural Language Helps

- **Composite field parsing** — "Tag 32A contains: 6-digit date (YYMMDD), 3-letter currency code, then amount with comma as decimal separator"
- **Ordering account conventions** — "Tag 50K: first line is account number (starting with /), remaining lines are name and address (up to 4x35 characters)"
- **Routing logic** — "Block 2 input/output indicator determines whether the message is sent or received"
- **Validation rules** — "Amount must not exceed 15 digits including decimal; currency must be valid ISO 4217"

## Example

```stm
// STM v2 — SWIFT MT103 Single Customer Credit Transfer (simplified)

schema swift_mt103 (format swift_mt, message_type "103",
  note "Single customer credit transfer — core payment fields"
) {
  record BASIC_HEADER (block 1) {
    app_id          STRING  (note "F = FIN, A = GPA")
    service_id      STRING  (note "01 = FIN/GPA, 21 = ACK/NAK")
    sender_bic      STRING  (length 12, required)
  }

  record APPLICATION_HEADER (block 2) {
    io_indicator    STRING  (note "I = input (sent), O = output (received)")
    message_type    STRING  (note "103")
    receiver_bic    STRING  (length 12, required)
  }

  // --- Text block (block 4) fields ---

  REFERENCE        STRING  (tag "20", block 4, status mandatory,
    note "Sender's reference — up to 16 characters, uniquely identifies the transaction"
  )

  record VALUE_DATE_AMOUNT (tag "32A", block 4, status mandatory,
    note """
    Composite field containing three values on a single line:
    - 6 digits: value date (YYMMDD)
    - 3 characters: currency code (ISO 4217)
    - Remaining: amount with comma as decimal separator
    Example: `230315GBP1250,00`
    """
  ) {
    value_date      DATE
    currency        STRING  (length 3)
    amount          DECIMAL (note "Comma-separated decimal in source")
  }

  record ORDERING_CUSTOMER (tag "50K", block 4, status mandatory,
    note """
    Multi-line field:
    - Line 1: account number (prefixed with `/`)
    - Lines 2-5: name and address (up to 4 x 35 characters)
    """
  ) {
    account         STRING
    name_address    STRING  (note "Up to 4 lines of 35 characters each")
  }

  BENEFICIARY_BIC  STRING  (tag "57A", block 4,
    note "Account-with institution — BIC of the beneficiary's bank"
  )

  record BENEFICIARY (tag "59", block 4, status mandatory,
    note """
    Multi-line field:
    - Line 1: account number (prefixed with `/`, optional)
    - Lines 2-5: beneficiary name and address
    """
  ) {
    account         STRING
    name_address    STRING
  }

  REMITTANCE_INFO  STRING  (tag "70", block 4,
    note "Up to 4 x 35 characters of payment details — often contains structured references"
  )

  CHARGES          STRING  (tag "71A", block 4, status mandatory,
    enum {BEN, OUR, SHA},
    note "BEN=beneficiary pays, OUR=sender pays, SHA=shared"
  )
}
```

### Key patterns

- **Block structure preserved.** `block 1`, `block 2`, `block 4` make the message envelope explicit.
- **Composite tags as records.** Tag `:32A:` is a single wire field but contains three semantic values — `record` makes the decomposition explicit.
- **Multi-line field conventions.** Tags like `:50K:` and `:59:` have line-based sub-structures documented in `note` descriptions.
- **Familiar identifiers.** `tag "32A"` is immediately recognisable to anyone who works with SWIFT messages.
