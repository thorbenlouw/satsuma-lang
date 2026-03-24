# Governance Metadata — LLM Interpretation Guidelines

## Core Principle

Governance metadata tokens in Satsuma `( )` blocks express data protection policy inline with the schema definition. When interpreting or generating Satsuma files, treat these tokens as binding constraints — not suggestions. Every governance token implies concrete downstream obligations for storage, access control, display, and lifecycle management.

## Token Interpretation Rules

### `pii`

- A boolean flag. If present, the field contains personally identifiable information as defined by GDPR Article 4(1), CCPA Section 1798.140(o), or equivalent regulation.
- `pii` does not imply a specific classification level. A public-facing name might be `pii` with `classification "INTERNAL"`, while a national ID number would be `pii` with `classification "RESTRICTED"`.
- When generating code or configurations from a Satsuma file, every `pii` field must be included in data subject access requests (DSAR) and right-to-erasure inventories.

### `classification "<level>"`

- Expresses a data classification tier. Common levels in ascending sensitivity: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
- Schema-level `classification` sets the default for all fields. Field-level `classification` overrides the schema default — always upward (a field should not be less classified than its schema).
- When no `classification` is present on a schema or field, do not assume a default. Flag it as a governance gap.

### `mask <strategy>`

- Declares how the field should be displayed to consumers who do not have full access. The strategy token is a convention name, not executable code.
- Common strategies:
  - `partial_email` — show first character and domain: `j***@company.com`
  - `last_four` — show only the last four characters: `****1234`
  - `hash` — display a one-way hash instead of the raw value
  - `redact` — replace entirely with `[REDACTED]`
- When generating views or API responses, apply the mask strategy to the field unless the consumer has an explicit classification-based exemption.

### `encrypt <algorithm>`

- Declares that the field must be encrypted at rest using the specified algorithm.
- Common values: `AES-256-GCM`, `AES-256-CBC`, `RSA-OAEP`.
- This is an at-rest requirement. Transport-layer encryption (TLS) is assumed and separate.
- When generating DDL or storage configurations, ensure the target system applies the specified encryption. If the target does not support field-level encryption, flag this as a compliance gap.

### `owner "<team>"`

- Identifies the team responsible for the schema's correctness, availability, and governance compliance.
- When generating documentation or catalogue entries, the owner is the primary contact for change requests and incident escalation.

### `steward "<person>"`

- Identifies the individual data steward responsible for governance decisions about this schema.
- The steward approves classification changes, retention exceptions, and access grants. When generating access request workflows, route approvals to the steward.

### `retention <policy>`

- Declares how long data must be kept and optionally what event starts the clock.
- Forms:
  - `retention "3y"` — 3 years from ingestion (implicit anchor)
  - `retention "7y"` — 7 years; use a `note` to specify the anchor date field
  - `retention "indefinite"` — no automatic deletion
- Field-level retention overrides schema-level retention. A field with `retention "3y"` inside a schema with `retention years 7` must be purged at 3 years even though the rest of the schema is retained for 7.
- When generating lifecycle management rules, create per-field deletion schedules where field-level overrides exist.

### `compliance {frameworks}`

- Lists the regulatory frameworks that govern this schema.
- Each framework implies a set of obligations. When interpreting:
  - `GDPR` — data subject rights, lawful basis, cross-border transfer restrictions
  - `CCPA` — consumer opt-out, sale disclosure, deletion rights
  - `HIPAA` — minimum necessary standard, BAA requirements, breach notification
  - `SOX` — audit trail, retention, access controls for financial data
  - `SOC2` — access controls, monitoring, incident response
- When generating compliance documentation, cross-reference each field's tokens against the obligations of each listed framework.

## Composing Security Policies from `classification` + `mask`

When both `classification` and `mask` are present on a field, they work together to define a tiered access model:

1. **Full access** — consumers with clearance at or above the field's classification level see raw values.
2. **Masked access** — consumers below the classification threshold see the masked representation.
3. **No access** — consumers without any grant see the field omitted entirely.

When generating role-based access control (RBAC) policies or view definitions:

- Create a full-access view filtered to the classification level.
- Create a masked view that applies the `mask` strategy for lower-clearance consumers.
- If a field has `classification "RESTRICTED"` with no `mask`, it should be omitted (not masked) for consumers below `RESTRICTED`.

## Generating Retention and Lifecycle Rules

When a schema has `retention` metadata, generate lifecycle rules as follows:

1. Parse the retention duration and anchor field (if present).
2. For each field with a field-level retention override, create a separate lifecycle rule with the shorter duration.
3. If the anchor field is present in the schema, use it as the partition or filter key for deletion queries.
4. If the anchor field references a date that may be null (e.g., `account_closure_date` for active accounts), the retention clock does not start until the anchor is populated. Document this as an exception.

Example DDL generation from `retention "7y"` with a note anchoring to `account_closure_date`:

```sql
-- Auto-generated from Satsuma retention policy
DELETE FROM account_master
WHERE account_closure_date IS NOT NULL
  AND account_closure_date < CURRENT_DATE - INTERVAL '7 years';
```

For field-level overrides (e.g., email with `retention "3y"`), generate column-level nulling:

```sql
-- Field-level retention: email (3y override)
UPDATE account_master
SET email = NULL
WHERE created_at < CURRENT_DATE - INTERVAL '3 years';
```

## How `pii` + `classification` + `encrypt` Compose

These three tokens address independent concerns:

| Token | Concern | Question It Answers |
|-------|---------|-------------------|
| `pii` | Identity | Does this field identify a natural person? |
| `classification` | Sensitivity | What access tier is required to see this field? |
| `encrypt` | Storage | How must this field be protected at rest? |

They compose freely. All eight combinations are valid:

- `(pii)` alone — marks identity relevance, no specific classification or encryption mandated yet (flag as incomplete).
- `(pii, classification "RESTRICTED")` — PII with high sensitivity, no field-level encryption (rely on disk-level encryption).
- `(pii, encrypt AES-256-GCM)` — PII with encryption but no explicit classification (flag classification as missing).
- `(pii, classification "RESTRICTED", encrypt AES-256-GCM)` — fully specified.
- `(classification "CONFIDENTIAL")` without `pii` — sensitive business data that is not personally identifiable.
- `(encrypt AES-256-GCM)` without `pii` — encrypted for business reasons, not PII.

When validating governance completeness, flag fields where `pii` is present but `classification` is absent. This is the most common governance gap.

## Governance Completeness Validation

When analysing a Satsuma file for governance completeness, check:

1. **Every `pii` field should have `classification`.** A `pii` flag without a classification tier is ambiguous — flag it.
2. **Every `classification "RESTRICTED"` or `classification "CONFIDENTIAL"` field should have either `encrypt` or a schema-level note explaining why encryption is not required.** Not all sensitive fields need field-level encryption (disk encryption may suffice), but the decision should be documented.
3. **Every schema with `pii` fields should have `owner` and `steward`.** Governance without accountability is unenforceable.
4. **Every schema with `compliance` should have `retention`.** Regulated data without a retention policy is a compliance risk.
5. **`mask` should be present on `pii` fields that appear in consumer-facing views or APIs.** If a field is `pii` but never exposed, masking is unnecessary — but document why.

When generating a governance audit report, list each check with pass/fail status and the specific fields involved.

## Organisation-Specific Token Extensibility

Teams can introduce custom tokens without language changes. When encountering an unfamiliar token in `( )` metadata:

1. **Do not discard it.** Treat it as a key-value pair or flag that the organisation has defined.
2. **Preserve it in all transformations.** When converting Satsuma to DDL, documentation, or catalogue entries, carry unknown tokens through as custom metadata.
3. **Document it.** If generating documentation, include custom tokens in a "Custom Metadata" section with a note that they are organisation-specific.

Common custom tokens seen in practice:

| Token | Typical Meaning |
|-------|----------------|
| `cost_center "<code>"` | Internal cost allocation code for storage and compute charges |
| `audit_level <tier>` | SOX or internal audit sampling tier (e.g., `critical`, `standard`, `minimal`) |
| `data_domain "<name>"` | Logical domain for data catalogue organisation |
| `lineage_tag "<id>"` | External lineage system cross-reference |
| `dq_rule "<rule>"` | Data quality rule identifier |

When generating code from a schema with custom tokens, emit them as comments or metadata annotations in the target system. Do not silently drop them.
