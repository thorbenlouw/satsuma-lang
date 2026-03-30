# Lesson 13 — The Governance & Audit Playbook

> **Personas:** Governance, Risk, Audit, Enterprise Architect

## Your Role in the Satsuma Model

As a governance or audit stakeholder, you need **defensible evidence**. Your questions are:

- Where does sensitive data flow, and is it properly protected?
- What data quality risks exist, and are they acknowledged?
- What business rules are ambiguous or unresolved?
- Can we trace every target field back to its source?
- What changed between versions, and why?

Satsuma gives you something most mapping specifications can't: **deterministic structural evidence** backed by a parser, combined with **explicit natural-language intent** that's bounded and extractable.

---

## PII Tracking and Data Classification

### Finding PII across the workspace

```
satsuma find --tag pii .
```

This returns every field tagged with `(pii)` across all files. The result is deterministic — if a field is tagged, it's found. If it's not tagged, it's not found.

### Tracing PII flow

For each PII field, trace where it flows:

```
satsuma arrows legacy_sqlserver.EMAIL_ADDR
```

The agent combines this with metadata checks to produce a PII flow audit:

| Source Field | Target Field | Encrypted? | Transform |
|---|---|---|---|
| `EMAIL_ADDR` (pii) | `email` (pii, format email) | No | `trim \| lowercase \| validate_email \| null_if_invalid` |
| `TAX_ID` (pii, encrypt) | `tax_identifier_encrypted` (pii, encrypt AES-256-GCM) | Yes | `error_if_null \| encrypt(AES-256-GCM, secrets.tax_encryption_key)` |
| `PHONE_NBR` | `phone` (format E.164) | No | NL: "Extract digits, format E.164" |

### What to look for:

- **PII flowing to unencrypted targets** — compliance risk.
- **PII fields without the `pii` tag** — the field might be sensitive but not marked (e.g., phone numbers, addresses).
- **PII in NL transforms** — if an NL transform references PII fields via `@ref` markers, the implementation must handle those fields appropriately.

---

## Warnings, Open Questions, and Risk Register

### Extracting all warnings and questions

```
satsuma warnings .
```

This returns every `//!` (warning) and `//?` (question/TODO) comment across the workspace.

### Building a risk register from Satsuma

The warnings and questions in a Satsuma workspace form a natural risk register:

| Type | Location | Content | Status |
|---|---|---|---|
| `//!` | `legacy_sqlserver.EMAIL_ADDR` | "not validated — contains garbage" | Mitigated: `null_if_invalid` applied |
| `//!` | `legacy_sqlserver.CREATED_DATE` | "stored as MM/DD/YYYY string" | Mitigated: `parse("MM/DD/YYYY")` applied |
| `//!` | `mfcs_json.containers[]` | "no source mapping" | Open: blocked on DWHT-2847 |
| `//?` | `discount_total` | "should refunds reduce discount_total?" | Open: awaiting business decision |

The `//!` warnings are explicitly placed by the team. They're not hidden in comments that nobody reads — they're structured, extractable, and auditable.

---

## Lineage as Evidence

### End-to-end traceability

For any target field, you can trace back to every source field that contributes to it:

```
satsuma arrows postgres_db.customer_id
```

Returns:
- Source: `legacy_sqlserver.CUST_ID`
- Transform: `uuid_v5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", CUST_ID)`
- Classification: `[structural]`

This is a deterministic, parser-backed lineage statement. It's not a manual entry in a spreadsheet that might be out of date — it comes from the same artifact that drives the implementation.

### NL transforms and compliance judgments

When a transform is `[nl]` or `[mixed]`, the lineage is still traceable (`@ref` markers create `[nl-derived]` arrows), but the transform logic requires interpretation. For governance purposes:

- **Structural transforms** can be verified mechanically against the implementation.
- **NL transforms** require human review to confirm the implementation matches the intent.

Document this distinction in your audit: "Field `display_name` uses an NL transform. Implementation verified manually against the stated business rule on [date]."

---

## Versioned Evidence

Because Satsuma files live in Git:

- **Every change is tracked** — who changed what, when, and (in the commit message) why.
- **Structural diffs** (`satsuma diff`) show exactly what changed between versions.
- **Point-in-time snapshots** can be reconstructed from any commit.
- **Review history** is preserved in pull requests.

For audit purposes, this means:
- You can reconstruct the mapping spec as it existed at any point in time.
- You can show who approved each change.
- You can demonstrate that validation was run before changes were committed.

---

## Compliance Workflows

### Pre-migration compliance check

1. `satsuma find --tag pii .` — locate all PII fields.
2. Trace each PII field through mappings — check for encryption.
3. `satsuma warnings .` — review all data quality risks.
4. `satsuma validate .` — confirm the spec is structurally valid.
5. Export Excel snapshot — attach to compliance documentation.

### Change impact assessment

1. `satsuma diff <before> <after>` — what changed?
2. `satsuma lineage` — what downstream systems are affected?
3. `satsuma find --tag pii` — does the change affect PII handling?
4. Review NL transforms in the changed area — does the intent still match the implementation?

### Periodic audit

1. `satsuma summary .` — current workspace inventory.
2. `satsuma warnings .` — current risk register.
3. `satsuma find --tag pii .` — current PII inventory.
4. `satsuma graph --json .` — full lineage graph for documentation.
5. Compare against previous audit — what has changed?

---

## Using Notes for Governance Documentation

Notes serve as governance documentation embedded in the spec itself:

```satsuma
note {
  """
  # Legacy Customer Migration

  ## Compliance
  - **Data Classification:** Contains PII (email, phone, tax ID, address)
  - **Encryption:** TAX_ID encrypted with AES-256-GCM using Secrets Manager key
  - **Retention:** Source data archived after migration, target retained per policy
  - **Consent:** Migration authorized under existing data processing agreement
  """
}
```

This documentation lives with the mapping, not in a separate governance document that might diverge. When the mapping changes, the governance notes are right there to update.

---

## Distinguishing Facts from Interpretations

For governance purposes, be precise about what's a fact and what's an interpretation:

| Evidence type | Source | Trust level |
|---|---|---|
| Field exists with type X and tag Y | Parser (via CLI) | Deterministic fact |
| Arrow connects field A to field B | Parser (via CLI) | Deterministic fact |
| Transform is `[structural]` with steps X, Y, Z | Parser (via CLI) | Deterministic fact |
| "This NL transform means [interpretation]" | Agent reasoning | Interpretation — verify |
| "This mapping is compliant because..." | Agent inference | Judgment — review |

Build your compliance case on deterministic facts (fields, arrows, tags, classifications) and clearly mark where agent interpretation is involved.

---

## Excel Snapshots for Governance Forums

When you need to present mapping evidence to a governance forum, compliance committee, or audit review:

1. Ask the agent to export a Satsuma-to-Excel snapshot.
2. The Overview tab provides the executive summary.
3. The Issues tab surfaces all warnings and open questions.
4. The Mapping tabs show field-level detail with transforms.
5. The Schema tabs provide reference material.

The Excel is a **point-in-time snapshot** — it reflects the state of the Satsuma files at the time of export. The `.stm` files remain the source of truth.

---

## Key Takeaways

1. Satsuma provides deterministic, parser-backed evidence for governance and audit.
2. PII tracking uses `(pii)` tags, traceable through arrows and lineage commands.
3. `//!` warnings and `//?` questions form a natural, extractable risk register.
4. Lineage is end-to-end traceable. Structural transforms can be verified mechanically; NL transforms require manual review.
5. Git versioning provides point-in-time reconstruction and change history for audit trails.
6. Build compliance cases on deterministic facts. Clearly mark where agent interpretation is involved.

---

**Next:** [Lesson 14 — The Integration Engineer's Playbook](14-integration-engineer-playbook.md)
