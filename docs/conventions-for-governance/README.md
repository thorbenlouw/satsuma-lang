# Conventions for Governance Metadata

## Why This Matters

Data governance is rarely optional. Regulations like GDPR, CCPA, and HIPAA impose concrete obligations on how data is classified, who is responsible for it, how long it is retained, and what protections must be applied at rest and in transit. In a traditional data platform these obligations are documented in wikis, spreadsheets, or metadata catalogues that live far from the actual data definitions. When the spec says one thing and the catalogue says another, the catalogue usually loses.

Satsuma's `( )` metadata system lets governance policy travel with the schema definition itself. A field annotated `(pii, classification confidential, encrypt AES-256-GCM)` is a single source of truth that humans can read, LLMs can interpret, and downstream tooling can enforce. There is no separate governance layer to keep in sync.

Because metadata tokens are conventions rather than grammar, teams can adopt the tokens below as-is or extend them with organisation-specific vocabulary. The parser does not need to change when a new compliance framework or retention policy appears.

## Metadata Conventions

### Schema-Level Tokens

| Token | Meaning | Example |
|-------|---------|---------|
| `owner "<team>"` | Owning team responsible for the schema | `owner "data-platform-team"` |
| `steward "<person>"` | Data steward contact for governance questions | `steward "jane.doe@company.com"` |
| `retention "<duration>"` | Retention policy duration | `retention "7y"` |
| `compliance {standards}` | Applicable compliance frameworks | `compliance {GDPR, CCPA, HIPAA}` |
| `classification "<level>"` | Default classification tier for all fields | `classification "INTERNAL"` |

### Field-Level Tokens

| Token | Meaning | Example |
|-------|---------|---------|
| `classification "<level>"` | Classification tier for this field | `classification "RESTRICTED"` |
| `mask <strategy>` | Display masking strategy for downstream consumers | `mask partial_email`, `mask last_four` |
| `pii` | Marks the field as personally identifiable information | `(pii)` |
| `encrypt <algorithm>` | Encryption requirement at rest | `encrypt AES-256-GCM` |
| `retention "<duration>"` | Field-level retention override | `retention "3y"` |

### Guidelines

- **Schema-level classification sets the floor.** A schema classified `INTERNAL` means every field is at least `INTERNAL`. Fields that need stronger protection override with their own `classification`.
- **`pii` is a flag, not a classification.** A field can be `pii` at any classification level. Use `classification` to express the protection tier and `pii` to signal that the field identifies a natural person.
- **`encrypt` and `mask` are independent.** Encryption governs storage; masking governs display. A field can have both, one, or neither.
- **Retention cascades downward.** A schema-level `retention "7y"` applies to all fields unless a field declares its own shorter retention.
- **Use natural language for policy nuance.** When a retention rule has exceptions or a classification depends on context, add a `note` explaining the conditions. Tokens capture the machine-readable rule; notes capture the human-readable reasoning.

## How Natural Language Helps

Governance rules are frequently conditional. A field might be `RESTRICTED` in production but `INTERNAL` in a de-identified research dataset. A retention policy might apply "7 years after account closure" but have exceptions for active litigation holds. These nuances do not fit into a single token.

Use `note` on schemas and fields to document:

- **Regulatory context** — which specific regulation drives a classification or retention decision
- **Exception conditions** — when a rule does not apply or is overridden by another policy
- **Cross-reference** — links to external policy documents, data catalogue entries, or legal opinions
- **Temporal anchors** — what event starts the retention clock (account closure, last login, contract end)

## Patterns

### 1. Field-Level PII with Classification and Masking

```satsuma
schema customer_profiles {
  customer_id   UUID       (pk, required)
  email         STRING     (pii, classification "RESTRICTED", mask partial_email)
  phone         STRING     (pii, classification "RESTRICTED", mask last_four)
  full_name     STRING     (pii, classification "CONFIDENTIAL")
  region        STRING     (classification "INTERNAL")
}
```

### 2. Schema-Level Ownership and Stewardship

```satsuma
schema billing_facts (
  owner "finance-data-eng",
  steward "alex.chen@company.com",
  classification "CONFIDENTIAL",
  note "Owned by Finance Data Engineering. Alex Chen is the data steward
        for all billing schemas — contact for access requests or classification disputes."
) {
  invoice_id    UUID       (pk, required)
  amount        DECIMAL(12,2)
  customer_id   UUID       (indexed)
}
```

### 3. Retention Policies with Temporal Anchors

```satsuma
schema account_master (
  retention "7y",
  note "7-year retention per SOX Section 802. Clock starts at account_closure_date.
        Active accounts are exempt — retention only applies after closure."
) {
  account_id          UUID          (pk, required)
  account_closure_date DATE
  email               STRING        (pii, retention "3y",
    note "Email retention is 3 years per GDPR Art. 17 right-to-erasure policy,
          shorter than the 7-year account retention."
  )
}
```

### 4. Multi-Framework Compliance Declarations

```satsuma
schema patient_records (
  compliance {HIPAA, GDPR, SOC2},
  classification "RESTRICTED",
  owner "health-data-platform",
  steward "dr.smith@company.com",
  note "Subject to HIPAA Safe Harbor de-identification (18 identifiers),
        GDPR data subject rights, and SOC2 access controls."
) {
  patient_id    UUID       (pk, required)
  ssn           STRING     (pii, classification "RESTRICTED", encrypt AES-256-GCM, mask last_four)
  diagnosis     STRING     (classification "RESTRICTED")
  visit_date    DATE
}
```

### 5. Custom / Organisation-Specific Tokens

Satsuma's token system is open-ended. Teams can introduce tokens that reflect their own governance vocabulary without any language changes:

```satsuma
schema gl_transactions (
  cost_center "CC-4420",
  audit_level critical,
  data_domain "finance",
  owner "gl-team",
  note "Custom tokens: cost_center maps to the internal cost allocation system,
        audit_level drives SOX audit sampling rates, data_domain is used by
        the data catalogue for discovery."
) {
  transaction_id    UUID          (pk, required)
  amount            DECIMAL(15,2) (audit_level critical)
  posting_date      DATE          (required)
  gl_account        STRING        (required, ref "chart_of_accounts.account_code")
}
```

## Canonical Examples

- **[`examples/filter-flatten-governance/filter-flatten-governance.stm`](../../examples/filter-flatten-governance/filter-flatten-governance.stm)** — demonstrates `classification`, `retention`, and `pii` tokens alongside filter and flatten idioms in a retail analytics pipeline.
- **[`examples/filter-flatten-governance/governance.stm`](../../examples/filter-flatten-governance/governance.stm)** — a dedicated governance example modelling a customer-360 scenario with full ownership, stewardship, retention, compliance, classification, masking, encryption, and custom organisation-specific tokens.
