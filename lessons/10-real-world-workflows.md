# Lesson 10 — End-to-End Delivery with Satsuma, the CLI, and an Agent

## The Delivery Loop

This lesson brings together everything from lessons 1-9 into the real delivery loop for a Satsuma-centered integration project. By the end, you should see Satsuma as a living collaboration artifact — not just a documentation format.

The loop has six phases:

1. **Gather** source material
2. **Draft** with the agent
3. **Validate** and lint
4. **Trace** impact and lineage
5. **Review** structural diffs
6. **Iterate** toward a versioned source of truth

---

## Phase 1: Gather Source Material

Real projects start with messy inputs:

- Database DDL or data dictionaries
- API documentation (Swagger/OpenAPI, sample payloads)
- Excel mapping spreadsheets from previous projects
- Conversations with subject matter experts
- Sample data files (CSV, JSON, XML)

Collect everything. Don't worry about format or completeness — the agent can work with imperfect inputs. What matters is that you capture enough context for the agent to generate a useful first draft.

---

## Phase 2: Draft with the Agent

### Drafting schemas

Provide the raw material to the agent and ask it to generate schema blocks:

- "Here's the DDL for the source database. Draft Satsuma schemas for the tables we need."
- "Here's a sample JSON payload. Draft a schema with proper nesting."
- "Here's the target data dictionary. Create a schema with the right types and metadata."

The agent drafts valid Satsuma, and you review for meaning (Lesson 03).

### Drafting mappings

Once schemas exist, draft the mappings:

- "Given the source and target schemas, draft a mapping. Here are the business rules: [paste rules]."
- "The email field needs validation and normalization. The status codes map like this: A=active, S=suspended..."

The agent generates arrows, transforms, and notes. You review for correctness (Lesson 05).

### Preserving ambiguity

When you encounter business rules you don't fully understand yet, don't force precision. Use NL transforms and questions:

```stm
-> health_score {
  "Derive from is_active, last_order_date, open_tickets, avg_csat_score.
   Exact thresholds TBD — need input from customer success team."
}                                                          //? thresholds pending review
```

This is better than inventing thresholds that might be wrong. The `//?` makes the open question discoverable.

---

## Phase 3: Validate and Lint

After drafting, run validation:

```
satsuma validate .
satsuma lint .
```

**`validate`** catches:
- Parse errors (malformed syntax)
- Unresolved references (mapping refers to a schema that doesn't exist)
- Missing required blocks

Fix validation errors before proceeding. These mean the file is structurally broken.

**`lint`** catches:
- Backtick references in NL that don't match declared fields
- Duplicate definitions
- Convention violations

Lint warnings are advisory — review them, but not all require action.

---

## Phase 4: Trace Impact and Lineage

Once the mapping is valid, use the CLI to understand data flow:

- `satsuma lineage --from <source_schema>` — where does source data go?
- `satsuma lineage --to <target_schema>` — where does target data come from?
- `satsuma arrows <schema.field>` — what arrows involve a specific field?
- `satsuma find --tag pii` — where does sensitive data flow?

This is especially important when making changes to an existing workspace. Before modifying a schema or mapping, trace the impact to understand what else might be affected.

---

## Phase 5: Review Structural Diffs

When you or the agent make changes, review them structurally:

```
satsuma diff <before> <after>
```

Structural diffs understand Satsuma semantics:
- Reformatting without logical changes shows as "no changes."
- Added/removed/modified arrows are clearly identified.
- New or dropped fields are highlighted.

This is much more useful than a line-by-line text diff for understanding what actually changed in the mapping.

---

## Phase 6: Iterate

Satsuma files live in version control (Git). The iteration cycle is:

1. Agent drafts or revises Satsuma
2. Human reviews the changes
3. Validate and lint
4. Commit with a meaningful message
5. Repeat

Over time, the Satsuma workspace becomes the **versioned source of truth** for the integration. Every change is tracked, every decision is documented in notes and comments, and every open question is flagged.

---

## Workspace Organization

A mature Satsuma workspace might look like:

```
project/
├── lib/
│   └── common.stm              ← shared fragments and transforms
├── lookups/
│   ├── country-codes.stm       ← reference data schemas
│   └── currency-rates.stm
├── crm/
│   └── customer-migration.stm  ← CRM to warehouse mapping
├── orders/
│   ├── order-ingestion.stm     ← order XML to lakehouse
│   └── order-lines.stm         ← flattened line items
├── support/
│   └── ticket-sync.stm         ← support system to warehouse
├── analytics/
│   └── metrics.stm             ← business metrics definitions
└── platform.stm                 ← entry point for platform-wide lineage
```

### Organization principles:

- **One integration per file** (or per directory for complex integrations).
- **Shared building blocks** in `lib/` — fragments, transforms, lookup schemas.
- **Platform entry point** at the root for cross-integration lineage.
- **Meaningful directory structure** that mirrors the systems or data domains.

---

## Excel-to-Satsuma Intake

Many projects inherit mapping specifications as Excel spreadsheets. The intake workflow (introduced in Lesson 03) converts these into Satsuma:

1. **Survey** the workbook — identify tab roles (mapping, reference, documentation).
2. **Identify** column roles — source field, target field, type, transform, notes.
3. **Generate** Satsuma — schemas, mappings, fragments.
4. **Self-critique** — the agent checks coverage, types, and transform fidelity.
5. **Human review** — you validate the result against the original spreadsheet.

The generated Satsuma becomes the source of truth going forward. The Excel is archived as historical reference.

---

## Satsuma-to-Excel Stakeholder Snapshots

Not everyone works in text files. Business analysts, project managers, and governance reviewers often need Excel:

Satsuma supports one-way Excel export as a **read-only, point-in-time snapshot**:

- The **Overview tab** provides an executive summary with system descriptions and notes.
- **Mapping tabs** show field-level arrows with source, target, transform, and classification.
- **Schema tabs** provide reference material for each system's data structure.
- **Issues tabs** surface all `//!` warnings and `//?` open questions.

### Key principle: Excel is a presentation snapshot, not the source of truth

The Excel export is designed for review, sign-off, and distribution — not editing. If someone makes changes, those changes go back into the Satsuma file. The `.stm` file is canonical.

This means:
- Re-run the export to get an updated snapshot after changes.
- Don't maintain parallel spreadsheets — that defeats the single-source-of-truth goal.
- Use the Excel for governance forums, stakeholder reviews, and email distribution.

---

## Review and Approval Patterns

### For mapping changes:

1. Agent drafts the change (new mapping, modified arrow, updated schema).
2. Run `satsuma validate` and `satsuma lint` — fix any errors.
3. Run `satsuma diff` — review the structural impact.
4. Run `satsuma lineage` — check for downstream effects.
5. Commit with a clear message explaining the change.
6. Export Excel snapshot for stakeholder review if needed.

### For new integrations:

1. Gather source material (DDL, API docs, sample data).
2. Agent drafts schemas and mappings.
3. Human reviews for business correctness.
4. Validate, lint, commit.
5. Iterate through review cycles.
6. Export final snapshot for sign-off.

### For compliance reviews:

1. `satsuma find --tag pii` — locate all PII fields.
2. Trace PII flow through mappings to check encryption.
3. `satsuma warnings` — identify open risks.
4. Export Excel snapshot with schema and mapping detail for the audit trail.

---

## Multi-File Collaboration

When multiple people (or agents) work on the same Satsuma workspace:

- **Keep files focused** — one integration per file, shared definitions in `lib/`.
- **Use imports** — don't copy fragments across files; import from `lib/common.stm`.
- **Definition uniqueness** — no two definitions can share a name (even across files).
- **Platform entry point** — maintain `platform.stm` for cross-integration lineage.
- **Version control** — Git tracks changes, enables branching, and supports code review.

---

## What Learners Should Internalize

By the end of this course, you should be able to say:

- *"I do not need to manually parse every Satsuma file to understand the workspace."*
- *"I know when to ask the CLI for structure and when to ask the agent for reasoning."*
- *"I can express business rules in bounded natural language without breaking the spec."*
- *"I can review agent-generated Satsuma for meaning, not just syntax."*
- *"I can use Satsuma as a living collaboration artifact, not just a documentation format."*

---

## Key Takeaways

1. The delivery loop: gather → draft → validate → trace → review → iterate.
2. Excel-to-Satsuma converts legacy spreadsheets into the canonical format. Satsuma-to-Excel produces read-only stakeholder snapshots.
3. Satsuma files live in version control. Every change is tracked, every decision is documented.
4. The workspace is organized by integration domain with shared building blocks in `lib/`.
5. Satsuma is a living spec — it grows and evolves with the project, with the agent handling mechanics and the human handling meaning.

---

**Next:** The playbook extensions adapt this model to specific roles — [Lesson 11 (BA)](11-ba-playbook.md), [Lesson 12 (Data Engineer)](12-data-engineer-playbook.md), [Lesson 13 (Governance)](13-governance-playbook.md), [Lesson 14 (Integration Engineer)](14-integration-engineer-playbook.md).
