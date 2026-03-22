# ASN.1 Conventions

## Why This Format is Difficult

ASN.1 (Abstract Syntax Notation One) is used in telecom (CDRs, signalling), PKI (X.509 certificates), and network protocols (SNMP, LDAP). It is challenging because:

- **Tag-based encoding** — fields are identified by numeric tags, not names, on the wire
- **Multiple encoding rules** — BER, DER, PER, and OER produce entirely different wire formats from the same schema
- **Implicit vs explicit tagging** — whether a tag includes its own type information depends on the module's tagging mode
- **CHOICE and OPTIONAL** — union types and optional fields are structural, not annotated
- **Deep nesting** — real-world ASN.1 modules (e.g., 3GPP CDR specs) can be dozens of levels deep

The decoded logical structure is often straightforward; the difficulty is in documenting the relationship between wire format and meaning.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `asn1` | `format asn1` |
| `encoding` | Wire encoding rule | `encoding ber` |
| `module` | ASN.1 module name if relevant | `module "TAP3-12"` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `asn1_tag` | Context-specific tag number | `asn1_tag 0` |
| `asn1_type` | Underlying ASN.1 type if not obvious | `asn1_type "OCTET STRING"` |
| `optional` | Field may be absent | `optional` |
| `choice` | Field is one of several alternatives | `choice` |
| `tagging` | Implicit or explicit if overridden | `tagging implicit` |

### Guidelines

- Use `asn1_tag` on every field — tag numbers are the canonical wire-format identifiers
- Include `encoding` at schema level so the decoding context is always clear
- Use name-first `record` for SEQUENCE and `list_of record` for SEQUENCE OF
- Document CHOICE resolution in `note` — the rules for determining which variant is present often depend on context or accompanying fields

## How Natural Language Helps

- **Tagging mode** — "Module uses implicit tagging; context tags replace the universal tag of the underlying type"
- **CHOICE resolution** — "Determined by the tag number present: tag 0 = mobile originated, tag 1 = mobile terminated"
- **Encoding quirks** — "BER allows indefinite-length encoding; DER requires definite-length and canonical ordering"
- **Decoded vs wire structure** — "After decoding, the nested SEQUENCE becomes a flat record with named fields"

## Example

```stm
// Satsuma v2 — ASN.1 Telecom CDR Record (simplified TAP3)

schema telecom_cdr (format asn1, encoding ber,
  module "TAP3-12",
  note "Transferred Account Procedure v3 — call detail record"
) {
  CALL_EVENT record (asn1_tag 0) {
    MOBILE_ORIGINATED record (asn1_tag 0, choice,
      note "Present when the call was originated by the recorded subscriber"
    ) {
      IMSI           STRING  (asn1_tag 0, required)
      MSISDN         STRING  (asn1_tag 1)
      CALLED_NUMBER  STRING  (asn1_tag 2)

      CALL_DURATION record (asn1_tag 3) {
        DURATION     INTEGER (asn1_tag 0, note "Duration in seconds")
      }

      CALL_TIMESTAMP STRING  (asn1_tag 4,
        asn1_type "OCTET STRING",
        note "BCD-encoded timestamp: YYMMDDhhmmss with timezone offset"
      )

      CAUSE_FOR_TERM STRING  (asn1_tag 5, optional,
        note "0=normal, 1=busy, 2=no answer — per 3GPP TS 32.298"
      )
    }

    MOBILE_TERMINATED record (asn1_tag 1, choice,
      note "Present when the call was terminated at the recorded subscriber"
    ) {
      IMSI           STRING  (asn1_tag 0, required)
      MSISDN         STRING  (asn1_tag 1)
      CALLING_NUMBER STRING  (asn1_tag 2)

      CALL_DURATION record (asn1_tag 3) {
        DURATION     INTEGER (asn1_tag 0)
      }
    }
  }
}
```

### Key patterns

- **CHOICE as variant records.** Mobile originated and mobile terminated calls are mutually exclusive — `choice` on the record makes this explicit.
- **Tag numbers everywhere.** `asn1_tag` on every element mirrors the wire format and lets engineers cross-reference against the ASN.1 module definition.
- **Encoding-specific notes.** BCD-encoded timestamps and the encoding rule itself are documented close to the fields they affect.
- **3GPP references.** Notes cite the relevant telecom specification for code table interpretation.
