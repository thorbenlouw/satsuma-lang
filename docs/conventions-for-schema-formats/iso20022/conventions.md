# ISO 20022 Conventions

## Why This Format is Difficult

ISO 20022 is the modern XML-based standard for financial messaging, gradually replacing SWIFT MT. It covers payments (pacs), cash management (camt), securities (sese/semt), and trade finance (tsmt). The format is challenging not because it is underspecified, but because it is *over-specified*:

- **Deeply nested XML** — a simple credit transfer (pacs.008) can be 6+ levels deep with dozens of optional elements
- **Namespace-heavy** — every message type has its own XML namespace, and versions change the namespace URI
- **Verbose element names** — `<CdtTrfTxInf>`, `<RmtInf>`, `<InstdAmt>` are abbreviated but not intuitive
- **Rich type system** — ISO 20022 defines its own data types (ActiveCurrencyAndAmount, ISODateTime, etc.) with embedded constraints
- **Optional everywhere** — most elements are optional, making the actual population pattern message- and institution-dependent
- **Code sets** — extensive external code lists (purpose codes, category purpose, charge bearer) with hundreds of values

The irony is that ISO 20022 schemas are technically precise — the XSD is authoritative. But the schemas are so large and deeply nested that they are effectively unreadable for humans. Satsuma's value here is compression: making a 400-element schema scannable.

## Metadata Conventions

### Schema-level

| Token | Usage | Example |
|-------|-------|---------|
| `format` | Always `iso20022` | `format iso20022` |
| `message_type` | ISO 20022 message identifier | `message_type "pacs.008.001.10"` |
| `namespace` | XML namespace for the message | `namespace "urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10"` |

### Field-level

| Token | Usage | Example |
|-------|-------|---------|
| `xpath` | Path within the XML document | `xpath "CdtTrfTxInf/Amt/InstdAmt"` |
| `iso20022_type` | ISO 20022 data type if non-obvious | `iso20022_type "ActiveCurrencyAndAmount"` |
| `code_set` | External code list reference | `code_set "ExternalPurpose1Code"` |

### Guidelines

- Use `xpath` relative to the message root — ISO 20022 paths are long enough without repeating the envelope
- Use name-first `record` blocks generously to mirror the XML nesting — but only for groups that carry distinct semantic meaning
- Collapse trivially nested wrappers into flatter structures with notes explaining what was elided
- Include `code_set` references so readers can look up valid values without digging through the XSD

## How Natural Language Helps

- **Structural compression** — "The full path is FIToFICstmrCdtTrf/CdtTrfTxInf/RmtInf/Strd/CdtrRefInf/Ref — collapsed here to the semantically meaningful elements"
- **Population patterns** — "IntrBkSttlmDt is technically optional but always populated by SWIFT gpi members"
- **Currency embedding** — "InstdAmt carries the currency as an XML attribute (Ccy), not a child element"
- **Version differences** — "In pacs.008.001.08, BIC was under FinInstnId/BIC; from .001.09 onwards it moved to FinInstnId/BICFI"

## Relationship to SWIFT MT

ISO 20022 is replacing SWIFT MT messages. Common equivalences:

| SWIFT MT | ISO 20022 | Description |
|----------|-----------|-------------|
| MT103 | pacs.008 | Customer credit transfer |
| MT202 | pacs.009 | Financial institution transfer |
| MT940 | camt.053 | Statement of account |
| MT199 | admi.004 | Free-format message |

See [`swift-mt/conventions.md`](../swift-mt/conventions.md) for the legacy counterpart. A mapping between MT103 and pacs.008 schemas would demonstrate the migration path.

## Example

```stm
// Satsuma v2 — ISO 20022 pacs.008 Customer Credit Transfer (simplified)

schema iso20022_credit_transfer (
  format iso20022,
  message_type "pacs.008.001.10",
  namespace "urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10",
  note """
  FI to FI Customer Credit Transfer — simplified to core payment fields.
  Full XSD defines 400+ elements; this captures the operationally
  significant subset for typical SWIFT gpi payments.
  """
) {
  GROUP_HEADER record (xpath "GrpHdr") {
    message_id       STRING       (xpath "MsgId", required)
    creation_dt      STRING       (xpath "CreDtTm", required,
      iso20022_type "ISODateTime"
    )
    num_transactions INTEGER      (xpath "NbOfTxs", required)
    settlement_method STRING      (xpath "SttlmInf/SttlmMtd", required,
      enum {INDA, INGA, COVE, CLRG},
      note "INDA=instructed agent, INGA=instructing agent, COVE=cover, CLRG=clearing"
    )
  }

  TRANSACTIONS list_of record (xpath "CdtTrfTxInf",
    note "One entry per payment instruction within the message"
  ) {
    end_to_end_id    STRING       (xpath "PmtId/EndToEndId", required)
    instruction_id   STRING       (xpath "PmtId/InstrId")
    uetr             STRING       (xpath "PmtId/UETR",
      note "Unique End-to-End Transaction Reference — UUID v4, required for SWIFT gpi"
    )

    interbank_amount DECIMAL(18,5) (xpath "IntrBkSttlmAmt", required,
      note "Currency carried as Ccy XML attribute on the element, not a child"
    )
    interbank_currency STRING     (xpath "IntrBkSttlmAmt/@Ccy", required)
    settlement_date  DATE         (xpath "IntrBkSttlmDt")

    charge_bearer    STRING       (xpath "ChrgBr", enum {DEBT, CRED, SHAR, SLEV},
      note "DEBT=debtor pays, CRED=creditor pays, SHAR=shared, SLEV=service level"
    )

    DEBTOR record (xpath "Dbtr") {
      name           STRING       (xpath "Nm")
      address record (xpath "PstlAdr") {
        country      STRING       (xpath "Ctry")
        address_lines STRING      (xpath "AdrLine",
          note "Up to 7 lines of 70 characters each"
        )
      }
    }

    DEBTOR_ACCOUNT   STRING       (xpath "DbtrAcct/Id/IBAN")
    DEBTOR_AGENT_BIC STRING       (xpath "DbtrAgt/FinInstnId/BICFI", required)

    CREDITOR record (xpath "Cdtr") {
      name           STRING       (xpath "Nm", required)
      address record (xpath "PstlAdr") {
        country      STRING       (xpath "Ctry")
      }
    }

    CREDITOR_ACCOUNT STRING       (xpath "CdtrAcct/Id/IBAN")
    CREDITOR_AGENT_BIC STRING     (xpath "CdtrAgt/FinInstnId/BICFI", required)

    REMITTANCE_INFO  STRING       (xpath "RmtInf/Ustrd",
      note "Unstructured remittance — up to 140 characters"
    )

    PURPOSE_CODE     STRING       (xpath "Purp/Cd",
      code_set "ExternalPurpose1Code",
      note "e.g., SALA=salary, SUPP=supplier payment, TAXS=tax payment"
    )
  }
}
```

### Key patterns

- **Structural compression.** A 400-element XSD is reduced to the operationally significant subset. The `note` on the schema documents what was elided and why.
- **XPath relative to message root.** Paths like `CdtTrfTxInf/PmtId/EndToEndId` are relative, avoiding repetition of the envelope.
- **XML attribute access.** `xpath "IntrBkSttlmAmt/@Ccy"` captures the currency attribute — a detail that would be invisible in a flat field list.
- **Collapsed wrappers.** `DbtrAgt/FinInstnId/BICFI` is a single field rather than three nested records — the intermediate wrappers add no semantic value.
- **Code set references.** `code_set "ExternalPurpose1Code"` points readers to the external list without inlining hundreds of values.
