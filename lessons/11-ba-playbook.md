# Lesson 11 — The Business Analyst's Playbook

> **Personas:** Business Analyst, Delivery Lead

## Your Role in the Satsuma Model

As a BA or delivery lead, you own **meaning**. You specify outcomes, define business rules, prioritize decisions, and approve the mapping spec. You do not need to become a syntax expert.

Your relationship with Satsuma:
- You **provide** business requirements, source-to-target relationships, data quality knowledge, and transformation rules.
- The **agent** turns your input into well-formed Satsuma — valid syntax, correct metadata, proper structure.
- You **review** the agent's output for business correctness — not syntax correctness.
- The **CLI** validates the syntax. The agent handles the mechanics. You handle the meaning.

---

## What You Should Focus On

### 1. Defining intent clearly

The most valuable thing you contribute is clear business intent. When you say:

> "Customer type R means retail, B means business, G means government. If it's null, default to retail."

The agent produces:

```stm
CUST_TYPE -> customer_type {
  map {
    R: "retail"
    B: "business"
    G: "government"
    null: "retail"
  }
}
```

You don't need to know the `map { }` syntax. You need to know the business rule.

### 2. Reviewing mappings for business correctness

When the agent drafts a mapping, you check:
- Does each arrow represent the right business relationship?
- Are the business rules captured correctly?
- Are edge cases handled (nulls, unknown values, unexpected formats)?
- Are the right fields marked as required, PII, or primary key?

You're reviewing **what the mapping says**, not **how it's formatted**.

### 3. Writing reviewable natural-language transforms

Some business rules are too complex for structural transforms. Write them in natural language:

```stm
-> display_name {
  "If customer type is retail (R or null), use first name + last name.
   If customer type is business (B) or government (G), use company name.
   Title-case the result. If all name fields are empty, use 'Unknown Customer'."
}
```

This is your strongest contribution — capturing the rule in precise, reviewable prose that the implementation team can use as their specification.

### 4. Flagging data quality issues

You often know things about the data that aren't in the database schema:

- *"About 15% of email addresses are garbage — they were never validated."*
- *"The date field is sometimes MM/DD/YYYY, sometimes DD/MM/YYYY depending on the region."*
- *"Some customer type values are null even though the column has a default."*

Capture these as `//!` warnings. The agent will place them correctly:

```stm
EMAIL_ADDR    VARCHAR(255)  (pii)    //! ~15% are garbage, never validated
CREATED_DATE  VARCHAR(10)            //! MM/DD/YYYY or DD/MM/YYYY depending on region
```

### 5. Marking open decisions

When something needs a decision that hasn't been made yet:

```stm
-> health_score {
  "Derive from activity signals. Exact thresholds pending."
}                                                          //? waiting on customer success team for thresholds
```

The `//?` makes this discoverable across the workspace. Nobody will forget it.

---

## Your Workflow: From Requirements to Spec

### Step 1: Describe the integration

Tell the agent what you're building:

> "We need to migrate 2.4 million customer records from a SQL Server 2008 database to PostgreSQL. Here's the source table DDL and target schema. The migration runs in batches of 10,000."

The agent drafts the file-level note and schema blocks.

### Step 2: Provide field-level rules

Walk through the fields:

> "CUST_ID maps to customer_id as a UUID — generate a deterministic UUID from the integer ID. Also keep the original as legacy_customer_id."
>
> "Email needs to be trimmed, lowercased, and validated. Null out invalid ones."
>
> "Phone numbers are a mess — see this distribution table [paste table]. Format to E.164."

The agent generates the arrows and transforms.

### Step 3: Review and iterate

The agent shows you the draft. You review:

- *"The phone formatting logic should also handle extensions — some numbers have 'x123' at the end."*
- *"You missed the address fields — they map to a separate addresses table."*
- *"The loyalty tier thresholds look right."*

The agent revises. You review again. This loop continues until the spec is accurate.

### Step 4: Validate

The agent runs `satsuma validate` and `satsuma lint` to check the file. Syntax issues are the agent's problem, not yours.

### Step 5: Share for review

If stakeholders need Excel, the agent can export a snapshot. If they can read Satsuma (or a summary), the agent can generate a plain-language summary of the mapping.

---

## Asking the Agent for Draft Mappings

Here are effective prompts for common BA tasks:

| What you need | How to ask |
|---|---|
| Draft a mapping from existing schemas | "Given the source schema `legacy_crm` and target schema `warehouse_customers`, draft a mapping. Here are the business rules: [rules]" |
| Explain an existing mapping | "Explain the `customer migration` mapping in business terms. What does each arrow do?" |
| Find unmapped fields | "Are there any target fields that don't have a source? List them." |
| Check for data quality risks | "What warnings and questions are flagged in this workspace?" |
| Generate a summary for stakeholders | "Summarize this mapping for a non-technical audience — what systems are involved, what data moves, what transforms happen?" |

---

## Using Notes Effectively

Notes are your primary authoring surface. Use them to capture:

### Context that shapes decisions

```stm
note {
  """
  # Legacy Customer Migration

  Part of **Project Phoenix** — decommissioning the legacy SQL Server 2008
  instance by Q2 2026. Migrates customer records to a normalized PostgreSQL
  schema with proper typing, encryption, and referential integrity.

  ## Constraints
  - Runs in **batches of 10,000** to prevent memory issues
  - Target enforces referential integrity — addresses created *before* customers
  """
}
```

### Assumptions in the mapping

```stm
mapping 'customer migration' {
  note {
    "Mapping assumptions:
     - All timestamps assumed US Eastern unless otherwise noted
     - NULL handling: source NULLs preserved unless target has stated default
     - Names are title-cased on migration"
  }
  ...
}
```

### Field-level rationale

```stm
CUST_ID -> customer_id (note "Deterministic UUID from legacy ID — enables idempotent reruns") {
  uuid_v5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", CUST_ID)
}
```

Notes make the spec self-documenting. When someone asks "why is this transform done this way?", the answer is right there in the file.

---

## Validation as Your Safety Net

You don't need to check syntax — that's what validation is for. But you should know that:

- **`validate` errors** mean the file is broken. The agent will fix these.
- **`lint` warnings** mean something might be wrong. Review them.
- **`//!` warnings** are data quality risks you or someone else flagged. Track them.
- **`//?` questions** are open decisions. Resolve them before the spec is final.

Ask the agent: *"Run validation and lint. Are there any issues I should know about?"*

---

## Key Takeaways

1. You own meaning — business rules, priorities, data quality knowledge. The agent owns syntax.
2. Provide clear business intent. The agent turns it into valid Satsuma.
3. Review for business correctness, not syntax correctness.
4. Write natural-language transforms for complex business rules — they're your strongest contribution.
5. Use `//!` for data quality warnings and `//?` for open decisions. Both are discoverable by the CLI.
6. Notes make the spec self-documenting. Use them liberally for context, assumptions, and rationale.

---

**Next:** [Lesson 12 — The Data & Analytics Engineer's Playbook](12-data-engineer-playbook.md)
