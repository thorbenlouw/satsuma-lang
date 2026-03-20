# FIX Protocol Conventions

## Why This Format is Difficult

FIX (Financial Information eXchange) is the dominant protocol for electronic trading — equities, FX, derivatives, and fixed income. It is challenging because:

- **Tag=value wire format** — fields are encoded as `tag=value|` pairs with SOH (0x01) delimiters, producing a flat stream with no hierarchy
- **Repeating groups** — groups of related fields repeat N times, but the grouping is implicit (the count tag precedes the group, and field order determines boundaries)
- **Tag number semantics** — fields are identified by numeric tags (e.g., tag 35 = MsgType, tag 44 = Price), requiring domain knowledge to interpret
- **Order sensitivity** — field order matters within repeating groups; reordering can change meaning
- **Venue-specific variants** — exchanges and ECNs define private tags and override standard field semantics

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `fix` | `format fix` |
| `fix_version` | FIX version | `fix_version "4.4"` |
| `venue` | Exchange or venue if applicable | `venue "LSE"` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `tag` | FIX tag number | `tag 35` |
| `count_tag` | Tag that holds the repeating group count | `count_tag 453` |

### Guidelines

- Always include `tag` on every field — FIX engineers think in tag numbers
- Use human-readable field names (e.g., `MSG_TYPE` not `TAG35`) with the tag in metadata
- Use `list` for repeating groups, with `count_tag` identifying the count field
- Document venue-specific tag interpretations in `note`
- Field ordering within a repeating group is significant — document it if non-obvious

## How Natural Language Helps

- **Repeating group boundaries** — "Group starts at tag 448 (PartyID); each repetition contains tags 448, 447, 452, 802 in order"
- **Venue-specific tags** — "LSE uses private tag 9730 for order priority timestamp; not present on other venues"
- **Message type semantics** — "MsgType D = New Order Single; MsgType 8 = Execution Report"
- **Conditional fields** — "Tag 44 (Price) is required for limit orders (OrdType=2) but absent for market orders (OrdType=1)"

## Example

```stm
// STM v2 — FIX 4.4 New Order Single (simplified)

schema fix_new_order (format fix, fix_version "4.4",
  note "New Order Single (MsgType=D) — core order fields"
) {
  MSG_TYPE        STRING  (tag 35, required, note "D = New Order Single")
  CL_ORD_ID      STRING  (tag 11, required, note "Client-assigned order identifier")
  SYMBOL         STRING  (tag 55, required)
  SIDE           STRING  (tag 54, required, enum {1, 2},
    note "1=Buy, 2=Sell"
  )
  ORDER_QTY      DECIMAL (tag 38, required)
  ORD_TYPE       STRING  (tag 40, required, enum {1, 2, 3, 4},
    note "1=Market, 2=Limit, 3=Stop, 4=Stop Limit"
  )
  PRICE          DECIMAL (tag 44,
    note "Required when OrdType is 2 (Limit) or 4 (Stop Limit); absent for market orders"
  )
  TIME_IN_FORCE  STRING  (tag 59, enum {0, 1, 3, 6},
    note "0=Day, 1=GTC, 3=IOC, 6=GTD"
  )
  TRANSACT_TIME  STRING  (tag 60, required,
    note "UTC timestamp: YYYYMMDD-HH:MM:SS.sss"
  )

  list PARTIES (count_tag 453,
    note """
    Repeating group of party identifications.
    Each repetition contains PartyID, PartyIDSource, PartyRole in order.
    Tag 453 (NoPartyIDs) holds the count.
    """
  ) {
    PARTY_ID       STRING (tag 448)
    PARTY_SOURCE   STRING (tag 447, enum {B, D},
      note "B=BIC, D=proprietary/custom"
    )
    PARTY_ROLE     STRING (tag 452,
      note "1=executing firm, 3=client, 7=entering firm, 36=entering trader"
    )
  }
}
```

### Key patterns

- **Tag numbers as canonical identifiers.** Every field carries `tag N`, matching FIX documentation and wire traces.
- **Repeating groups as lists.** `count_tag 453` makes the implicit grouping mechanism explicit; the `note` documents field ordering within the group.
- **Conditional presence.** Price is documented as conditionally required based on order type — this cannot be expressed structurally, so it lives in a `note`.
- **Enum codes with meaning.** FIX uses numeric codes for everything; `note` provides the human-readable mapping alongside the `enum`.
