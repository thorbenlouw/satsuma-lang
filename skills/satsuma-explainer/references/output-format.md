# Output Format Reference

Use this structure for all explanations. Omit sections that don't apply (e.g., skip
"PII & Governance" if no PII fields exist). Adapt depth per the audience table in
SKILL.md.

---

## For non-technical audiences (PO, BA, general)

Write in prose paragraphs. No code, no syntax, no metadata tokens.

### Structure

**1. Overview (1–2 paragraphs)**
What this mapping does in plain English. What system is the data coming from? Where
is it going? Why does this mapping exist? Pull from `note {}` blocks and the mapping
name for context.

If the workspace uses a data modelling convention, introduce it here in plain terms:
- **Kimball**: "This pipeline builds a star schema — a central facts table (measurements
  like sales amounts) surrounded by dimension tables (descriptive context like customers,
  products, stores) that let analysts slice and filter the data."
- **Data Vault**: "This pipeline uses a Data Vault architecture — business keys are stored
  in hubs, descriptive details in satellites (which track every change), and relationships
  between entities in links. This design prioritizes auditability and handling multiple
  source systems."
- **Flat/custom**: Just describe the flow without naming a methodology.

**2. Data architecture (include only if modelling tokens present)**
Walk through the major entities and how they relate. For a Kimball star schema, explain
which dimensions exist and which facts reference them. For Data Vault, explain the
hub/satellite/link structure. Use concrete business language:
- "The customer dimension tracks customer details and keeps a full history of changes
  (when an email or loyalty tier changes, a new version is created)."
- "The sales fact table records one row per item sold, linking to the customer, product,
  and store dimensions."
- "The customer hub is the master registry of customer IDs. Two satellites track
  different aspects: demographics (name, email) and loyalty details (tier, points)."

**3. What data moves (prose with inline field descriptions)**
Walk through the key fields being mapped. Group logically (identifiers, contact info,
financial data, etc.). For each group, explain:
- What the source data looks like
- What happens to it (transformation in plain English)
- What the target expects

Do NOT list every field mechanically. Focus on what matters: business-critical fields,
fields with transformations, and fields with warnings.

**3. Business rules & decisions (bulleted or numbered)**
Extract rules from NL transforms, `map {}` blocks, and notes. State each rule plainly:
- "Customer type codes R, B, G are translated to 'retail', 'business', 'government'. If the code is missing, it defaults to 'retail'."
- "Phone numbers are reformatted to international format. If the number can't be parsed, a warning is logged but the record is still processed."

**4. Known issues & warnings**
Surface every `//!` warning and `//?` open question. Frame as risks:
- "⚠️ Some customer type codes are null in the source system — these will default to 'retail', which may not be correct."
- "❓ Open question: How should 10-digit phone numbers outside the US be handled?"

**5. Gaps & missing coverage**
List target fields with no source mapping. Explain the implication:
- "The target requires a `display_name` but there's no direct source field — it's computed from first name, last name, or company name depending on customer type. This logic is described in natural language and will need human review during implementation."

Note: for Kimball and Data Vault schemas, mechanical columns (surrogate keys,
hash keys, validity timestamps, row hashes, load dates) are intentionally omitted
from the spec — they are inferred from the schema's metadata tokens. Do NOT report
these as gaps.

**6. How data is loaded (include only if merge tokens present)**
For each mapping with a `merge` token, explain in plain terms:
- "This mapping updates existing customer records when they change, and inserts new
  ones that haven't been seen before. Records are matched by customer ID."
- "Order events are appended — every event becomes a new row, nothing is updated or
  deleted. This creates an audit trail."
- "Deleted customers are not physically removed. Instead, they are flagged as deleted
  with a timestamp, so historical reports still work."
- "The product catalog is completely reloaded from scratch each night. A safety
  check aborts the load if fewer than 1,000 products are returned."

**7. PII & governance (if applicable)**
Which fields contain personal data? Is encryption specified? Does PII flow downstream
to other schemas? State plainly:
- "Email addresses are tagged as personally identifiable information (PII). The mapping applies validation and lowercasing but no encryption at this stage."
- "Tax IDs are encrypted with AES-256-GCM before being written to the target."

Also cover (when present):
- **Classification**: "Customer profile data is classified as RESTRICTED — only
  authorized teams can access the raw values. Other users see masked data."
- **Retention**: "Customer profiles are retained for 7 years. Email addresses have
  a shorter 3-year retention — they are purged earlier even though the rest of the
  record is kept."
- **Masking**: "For users without full access, credit card numbers show only the
  last four digits."
- **Compliance**: "This data falls under GDPR and SOX regulations, which require
  audit trails, deletion rights, and retention policies."
- **Governance gaps**: Flag any PII field missing a classification, any classified
  field missing encryption rationale, any schema with PII but no owner.

**8. Downstream consumers (include only if report/model schemas present)**
Explain who and what actually uses this data:
- "The weekly sales dashboard in Looker reads from the orders fact table and product
  dimension. It refreshes every Monday at 6 AM UTC."
- "A churn prediction model in MLflow uses customer tenure, recent order count, and
  average order value as features. It retrains weekly and is promoted to production
  only if accuracy exceeds 82%."

For impact analysis, trace changes: "If the customer email field changes upstream,
it flows through to the customer risk dashboard in Tableau, where it is displayed
to the risk-ops team."

---

## For technical audiences (data engineer, architect)

Can include Satsuma syntax snippets, metadata tokens, and CLI output references.

### Structure

**1. Workspace summary**
Schemas, mappings, fragments, metrics, namespace structure. One paragraph or a
compact table.

If the workspace uses data modelling conventions, identify the approach and list
the entity types:
- **Kimball**: which schemas are dimensions (and their SCD types), which are facts
  (and their grains), any conformed dimensions shared across star schemas.
- **Data Vault**: which schemas are hubs, satellites, links; parent relationships;
  effectivity satellites and driving keys.
- **Consumers**: any report or model schemas, their source dependencies and tools.

Note which mechanical columns are inferred (surrogate keys, hash keys, validity
timestamps, etc.) so reviewers know they're intentionally absent from the spec.

**2. Data architecture (include only if modelling tokens present)**
Describe the modelling topology:
- Entity types and their roles (dimension/fact or hub/satellite/link)
- SCD strategies per dimension, including tracked vs. ignored fields
- Fact grains and dimension references (which dimension FKs are inferred)
- Consumer schemas and their upstream dependencies
- Cross-namespace imports and how schemas flow between layers

**3. Mapping walkthrough**
For each mapping:
- Source(s) and target, including filters and join descriptions
- **Merge strategy**: which `merge` token is used, the match key, and any
  `on_match`/`on_no_match` overrides. Flag mismatches (e.g., `full_refresh` +
  `scd 2` = history destruction).
- Arrow-by-arrow breakdown grouped by classification:
  - `[none]` — list as direct copies
  - `[nl]` — quote the NL intent, flag ambiguity
  - `[nl-derived]` — flag as implicit, verify references exist
- `map {}` blocks — show the value mapping table
- Pipe chains — describe the transformation pipeline

**4. Coverage analysis**
Table of unmapped target fields from `satsuma fields --unmapped-by`. For mapped
fields, note the classification.

For Kimball/Data Vault schemas, do NOT list mechanical columns (surrogate keys,
hash keys, load dates, validity timestamps, row hashes) as unmapped — these are
inferred from metadata tokens.

**5. Data quality risks**
All `//!` warnings and `//?` questions with their locations. Cross-reference with
the affected arrows.

**6. PII lineage & governance audit**
For each PII-tagged field, show the downstream chain from `field-lineage`. Note
where encryption or masking is applied (or missing).

Run the governance completeness checklist:
- Every `pii` field has `classification` → pass/fail
- Every `RESTRICTED`/`CONFIDENTIAL` field has `encrypt` or documented rationale → pass/fail
- Every schema with `pii` fields has `owner` and `steward` → pass/fail
- Every schema with `compliance` has `retention` → pass/fail
- Every `pii` field on a consumer schema (report/model) is an exposure point — flag it

For consumer schemas, trace PII all the way to the dashboard or model that
displays it. This is the final exposure surface.

**7. Recommendations**
Concrete next steps:
- Fields needing explicit transforms instead of NL descriptions
- Missing `@ref` annotations in NL strings
- PII fields without encryption metadata
- PII fields without classification (governance gap)
- Schemas with PII but no owner or steward
- Missing retention policies on regulated data
- `merge full_refresh` + `scd 2` conflicts (history destruction risk)
- Merge strategies not declared on persistent targets (ambiguous load behavior)
- Consumer schemas missing `source {}` declarations (broken lineage)
- Open questions requiring stakeholder decisions

---

## Tone guidelines

- Lead with what the mapping *does*, not what Satsuma *is*.
- Use "this mapping" and "this spec", not "this Satsuma file".
- For warnings, be direct: "This is a risk because..." not "It might be worth considering..."
- For gaps, be specific: name the field, name the consequence.
- For NL transforms, distinguish between what the spec *says* and what you *interpret*.
  Use phrases like "The spec describes this as..." rather than "This field is transformed by..."
