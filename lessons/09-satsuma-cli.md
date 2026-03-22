# Lesson 09 — Human-Agent Workflows for Navigation, Impact, and Review

## From Commands to Workflows

Lesson 08 introduced the CLI commands as individual tools. This lesson shows how the agent composes them into complete workflows that answer the questions you actually ask during a data integration project.

The pattern is always the same:
1. **You ask a question** in business terms.
2. **The agent selects and runs** the right CLI commands.
3. **The agent combines** the results with its own reasoning.
4. **You review** the answer and decide what to do.

---

## Workflow 1: Impact Analysis

**Question:** *"We're changing the format of `CUST_ID` in the source system. What breaks?"*

**Agent approach:**

1. Run `satsuma arrows legacy_sqlserver.CUST_ID` to find all arrows that reference this field.
2. Run `satsuma lineage --from legacy_sqlserver` to see which downstream schemas are affected.
3. Run `satsuma nl` to find NL transforms that reference `` `CUST_ID` `` in backticks — these are implicit dependencies.

**Agent response (example):**

> `CUST_ID` is used in 3 arrows:
> - `CUST_ID -> customer_id` — generates a UUID via `uuid_v5()`. Changing the format would change all generated UUIDs.
> - `CUST_ID -> legacy_customer_id` — direct mapping. Type change may require target column update.
> - Backtick reference in `display_name` NL transform — used to check customer type. Logic depends on `CUST_TYPE`, not `CUST_ID` directly.
>
> Downstream impact: `postgres_db` is the only direct target. No further downstream schemas reference `postgres_db`.

**What you decide:** Whether to regenerate UUIDs (breaking change) or maintain a lookup table for backward compatibility.

---

## Workflow 2: Coverage Check

**Question:** *"Are all target fields mapped? What's missing?"*

**Agent approach:**

1. Run `satsuma fields <target_schema>` to get the full field list.
2. Run `satsuma arrows` for each field to check which have incoming arrows.
3. Report any target fields with no source arrow.

Alternatively, use `satsuma match-fields --source <s> --target <t>` for a quick comparison.

**Agent response (example):**

> All 18 fields in `postgres_db` are mapped:
> - 14 have direct source arrows
> - 3 are computed (no source): `display_name`, `address_id`, `migration_timestamp`
> - 1 is derived from a calculation: `loyalty_tier` (from `LOYALTY_POINTS`)
>
> No unmapped target fields found.

---

## Workflow 3: PII Audit

**Question:** *"Where does PII flow in this workspace? Is it properly protected?"*

**Agent approach:**

1. Run `satsuma find --tag pii .` to locate all PII-tagged fields.
2. For each PII field, run `satsuma arrows <field>` to trace where it flows.
3. Check target field metadata for encryption tags with `satsuma meta`.
4. Report any PII that flows to an unencrypted target.

**Agent response (example):**

> PII fields found:
> - `legacy_sqlserver.EMAIL_ADDR` (pii) → `postgres_db.email` (pii, format email) — **no encryption**
> - `legacy_sqlserver.TAX_ID` (pii, encrypt) → `postgres_db.tax_identifier_encrypted` (pii, encrypt AES-256-GCM) — **encrypted**
>
> **Risk:** `email` flows from source to target without encryption. If the target table is accessible to non-privileged users, this may be a compliance concern.

**What you decide:** Whether email needs encryption, masking, or is acceptable in plaintext.

---

## Workflow 4: Change Review with diff

**Question:** *"I just updated the customer mapping. What changed structurally?"*

**Agent approach:**

1. Run `satsuma diff <before> <after>` to compare the two versions structurally.
2. Report added, removed, and modified arrows, fields, and metadata.

**Agent response (example):**

> Structural diff:
> - **Added:** Arrow `LOYALTY_POINTS -> loyalty_tier` with conditional `map { }`
> - **Modified:** Arrow `PHONE_NBR -> phone` — added `| warn_if_invalid` to the transform pipeline
> - **Removed:** Arrow `NOTES -> notes` — the notes field is no longer mapped
>
> **Warning:** Removing the `notes` mapping means `postgres_db.notes` will be NULL for all records. Was this intentional?

The structural diff is more useful than a line-by-line text diff because it understands Satsuma semantics. A reformatted file with no logical changes shows as "no changes."

---

## Workflow 5: Ambiguity Escalation

**Question:** *"What decisions are still unresolved in this workspace?"*

**Agent approach:**

1. Run `satsuma warnings .` to find all `//!` and `//?` comments.
2. Run `satsuma nl` to extract NL transforms that might contain hedging language ("TBD", "unclear", "pending").
3. Organize by severity: blocking decisions vs. nice-to-have clarifications.

**Agent response (example):**

> **Blocking (3):**
> 1. `//?` on `legacy_sqlserver.STATUS_CD` — "need status code definitions" (no mapping possible without this)
> 2. `//!` on `containers[]` — "no source mapping" (required by target but no data available)
> 3. `//?` on `discount_total` — "should refunds reduce discount_total?"
>
> **Informational (5):**
> 1. `//!` on `EMAIL_ADDR` — "not validated — contains garbage" (mapping handles this with `null_if_invalid`)
> 2. `//!` on `CREATED_DATE` — "stored as MM/DD/YYYY string" (mapping parses with `parse("MM/DD/YYYY")`)
> 3. ...

---

## Workflow 6: Whole-Workspace Reasoning

**Question:** *"Give me the full picture of this platform's data flow."*

**Agent approach:**

1. Run `satsuma graph --json .` to export the complete workspace graph.
2. Parse the graph to identify source systems, intermediate layers, and final targets.
3. Summarize the data flow in business terms.

The `--json` output includes:
- **Nodes** — every schema, mapping, and metric with their metadata.
- **Edges** — every data flow relationship (schema-to-mapping, mapping-to-schema, field-level arrows).

The agent can use this to answer questions like:
- "Which sources feed into the analytics warehouse?"
- "What's the longest data flow path?"
- "Which schemas are leaf nodes (nothing flows out)?"

---

## Distinguishing Deterministic Evidence from Agent Inference

This is critical. When the agent presents results, some parts are facts and some are interpretations:

| Source | Type | Trust level |
|---|---|---|
| CLI output (schema definitions, arrow lists, field counts) | Deterministic fact | Exact — verified by the parser |
| Transform classification (`[structural]`, `[nl]`, etc.) | Deterministic fact | Exact — determined by syntax |
| Agent's summary of what an NL transform does | Interpretation | Review — the agent might misunderstand intent |
| Agent's recommendation about a risk or gap | Inference | Decide — the agent provides input, you make the call |

When the agent says "this PII field is unencrypted," that's a fact from the metadata. When the agent says "this may be a compliance concern," that's an inference you need to evaluate in your context.

---

## Quick Reference: Question → Workflow

| You ask | Agent runs |
|---|---|
| "What does this workspace contain?" | `summary` |
| "Show me the customer schema" | `schema <name>` |
| "What breaks if I change field X?" | `arrows` + `lineage` + `nl` |
| "Are all target fields covered?" | `fields` + `arrows` |
| "Where does PII flow?" | `find --tag pii` + `arrows` + `meta` |
| "What changed in this update?" | `diff` |
| "What's still unresolved?" | `warnings` |
| "What NL transforms need review?" | `nl` + `arrows` (filter `[nl]` / `[mixed]`) |
| "Show me the full data flow" | `graph --json` |
| "Is this file valid?" | `validate` + `lint` |

---

## Key Takeaways

1. The agent composes CLI commands into workflows that answer business questions.
2. Impact analysis traces field-level arrows, schema-level lineage, and NL backtick references.
3. Coverage checks compare target fields against incoming arrows.
4. PII audits trace sensitive data flow and check for encryption.
5. Structural diffs understand Satsuma semantics — reformats don't show as changes.
6. Always distinguish deterministic CLI output (facts) from agent interpretation (inference).

---

**Next:** [Lesson 10 — End-to-End Delivery with Satsuma, the CLI, and an Agent](10-real-world-workflows.md) — bringing it all together into a real delivery loop.
