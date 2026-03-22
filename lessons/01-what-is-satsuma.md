# Lesson 01 — What Satsuma Is Really For

## The Problem Satsuma Solves

Every data integration project produces mapping documents. They live in Excel spreadsheets, Confluence pages, Word documents, and Slack threads. They start clean, then decay:

- Column meanings drift between authors.
- Transformation logic is described in vague prose nobody re-reads.
- Nobody can tell whether two fields still connect after three rounds of changes.
- Validation is manual — someone eyeballs the spreadsheet and hopes for the best.

Satsuma replaces those artifacts with a single, parseable, versionable text file. It is a **domain-specific language for source-to-target data mapping**. But unlike a general-purpose programming language, Satsuma is designed to be read by business analysts and written — or at least drafted — by an AI agent.

---

## The Hybrid Model

Satsuma sits at the intersection of three capabilities:

| Capability | Who or what does it |
|---|---|
| **Deterministic structure** — schemas, field types, arrows, metadata | The **parser** extracts these exactly. No interpretation needed. |
| **Bounded natural language** — business rules, transformation intent, notes | The **agent** interprets these, drafts them, and reasons about them. |
| **Meaning, priorities, and decisions** — what matters, what's correct, what ships | The **human** owns these. Always. |

This is the operating model for the entire course. Every lesson builds on it:

- The **Satsuma CLI** gives you exact structural facts (schemas, arrows, lineage, validation errors).
- The **AI agent** reads natural-language content, generates valid Satsuma, explains blocks in business terms, and composes CLI workflows.
- **You** steer, review, approve, and decide.

---

## Three Delimiters, Three Jobs

The entire Satsuma language is built on three delimiter pairs, each with a distinct purpose:

| Delimiter | Purpose | Example |
|---|---|---|
| `( )` | **Metadata** — tags, annotations, and structural attributes | `(pk, required, pii)` |
| `{ }` | **Structural content** — block bodies, transform pipelines, value maps | `{ trim \| lowercase }` |
| `" "` | **Natural language** — human-readable intent, business rules, notes | `"Extract digits and format as E.164"` |

If you understand what these three delimiters do, you can read any Satsuma file at a glance — even before you know the full syntax.

---

## Comments: Three Flavours

Satsuma has three comment styles, each with a different audience:

```stm
// This is a regular comment — author-side context, for people reading the file
//! This is a warning — something is wrong or risky in the data
//? This is a question or TODO — something unresolved that needs a decision
```

The CLI can extract `//!` warnings and `//?` questions across a whole workspace, making them useful for tracking data quality risks and open decisions.

---

## A First Look: Schema + Mapping

Here is a minimal Satsuma file that maps customer data from a legacy CRM to a data warehouse:

```stm
schema crm (note "Legacy CRM system") {
  id       INT           (pk)
  name     STRING(200)
  email    STRING(255)   (pii)
  status   CHAR(1)       (enum {A, I})
}

schema warehouse (note "Data Warehouse") {
  customer_id   UUID        (pk, required)
  display_name  STRING(200) (required)
  email_address STRING(255) (format email)
  is_active     BOOLEAN
}

mapping {
  source { `crm` }
  target { `warehouse` }

  id     -> customer_id   { uuid_v5("namespace", id) }
  name   -> display_name  { trim | title_case }
  email  -> email_address { trim | lowercase | validate_email | null_if_invalid }
  status -> is_active     { map { A: true, I: false } }
}
```

Even without knowing all the syntax rules, you can see:

1. **Two schemas** describe the source and target structures, with metadata in parentheses.
2. **A mapping block** declares which schema is the source and which is the target.
3. **Arrows** (`->`) show how each source field maps to a target field.
4. **Transforms** in `{ }` describe what happens to the data along the way — some are structural pipelines (`trim | lowercase`), some use value maps (`map { A: true, I: false }`), and some could be natural language.

---

## What Can Be Answered Structurally vs. What Requires Judgment

This distinction is the most important idea in the course. Here is how it plays out:

### The CLI can answer these deterministically

- What schemas exist in this workspace?
- What fields does `warehouse` have?
- Which fields are tagged `pii`?
- What arrows connect `crm` to `warehouse`?
- Are there any parse errors?
- Are there any lint warnings?

These answers come from the parser. They are exact. There is no interpretation involved.

### The agent must reason about these

- What does the natural-language transform on `display_name` actually mean?
- Is the `uuid_v5` namespace appropriate for this use case?
- Does the mapping cover all the business requirements?
- Should `null` status values map to `true` or `false`?
- Is the `pii` tag on `email` sufficient for compliance, or do we need encryption too?

These questions involve meaning, context, and judgment. The agent can help reason about them, but the human makes the call.

---

## What Humans Own vs. What Agents Own

| Human responsibilities | Agent responsibilities |
|---|---|
| Defining what the integration *means* | Drafting valid Satsuma from requirements |
| Deciding which business rules apply | Generating correct syntax and structure |
| Reviewing and approving mappings | Composing CLI commands to extract facts |
| Resolving ambiguities and open questions | Explaining blocks in business terms |
| Prioritizing and making tradeoffs | Detecting omissions and inconsistencies |

The human never needs to memorize every syntax rule. The agent never gets to decide what the business logic should be.

---

## The Running Scenario

Throughout this course, we use a single running scenario:

> **Acme Corp is migrating customer and order data from a legacy CRM into a modern analytics platform.**

In each lesson, we progressively build out the Satsuma specification for this migration — from reading existing files, to drafting schemas, to writing mappings and transforms, to validating and tracing lineage across the workspace.

---

## Key Takeaways

1. Satsuma is a parseable, versionable replacement for mapping spreadsheets — not a programming language.
2. Three delimiters (`( )`, `{ }`, `" "`) handle metadata, structure, and natural language respectively.
3. The parser and CLI extract structural facts exactly. The agent interprets natural language and drafts valid Satsuma. The human owns meaning and decisions.
4. You do not need to memorize the full language to start working with it. Understanding the hybrid model is enough to begin.

---

**Next:** [Lesson 02 — Reading Satsuma with an Agent](02-schemas.md) — how to approach an unfamiliar Satsuma file without becoming a syntax archaeologist.
