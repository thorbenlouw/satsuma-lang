# Satsuma for Data Engineers — AI-Assisted Implementation Workflows

## The Problem Satsuma Solves for Data Engineers

You have been here before. A business analyst hands you a spreadsheet with 200 rows of source-to-target mappings. Column A is source field, Column B is target field, Column F says "Transform" and contains entries like "clean up and convert" or "see notes tab." The notes tab has 14 rows, three of which are relevant, and two of those contradict each other. You spend two days reverse-engineering intent before writing a single line of code.

Now imagine feeding that spreadsheet to an AI coding agent. The model does its best, but it hallucinates column names, invents join conditions, and guesses at merge strategies because the spreadsheet gave it nothing to anchor on. You spend two more days reviewing and correcting the output. The AI saved you no time at all.

Satsuma fixes both problems by giving you a **constrained, parseable, version-controlled contract** that sits between business requirements and implementation code. It captures what the mapping should do precisely enough that an AI agent can generate correct scaffolding on the first pass, yet readably enough that a BA can review and sign it off.

For you as a data engineer, the key properties are:

- **Parseable structure.** Schemas, arrows, transforms, and metadata have syntactic boundaries. An AI model does not have to guess where one concept ends and another begins.
- **Semantic metadata.** Tokens like `(pk)`, `(scd 2)`, `(merge upsert, match_on customer_id)` give an AI agent the precise context it needs to generate correct DDL, merge logic, and test assertions.
- **Scoped natural language.** Complex business logic lives in `" "` strings inside the mapping, not in a separate document. The AI knows exactly which arrow the logic belongs to.
- **Version control.** `.stm` files are plain text. They diff, merge, and review in pull requests like any other code artifact.

If you are new to the Satsuma syntax itself, work through the [BA Tutorial](ba-tutorial.md) first. It covers schemas, arrows, transforms, and metadata from the ground up. This tutorial assumes you know the basics and focuses on **workflow**: how you combine Satsuma specs with AI agents to go from intent to implementation.

---

## The Satsuma + AI Workflow

The core loop looks like this:

1. **Receive or co-author a Satsuma spec.** A BA writes the initial spec (or you write it together). It captures schemas, field-level mappings, transforms, and metadata.

2. **Enrich with implementation metadata.** You add conventions the BA may not know about: merge strategies, SCD types, Data Vault tokens, grain declarations, governance flags. These are the codegen hints that make AI output accurate.

3. **Feed the spec to an AI agent.** Paste or upload the `.stm` file (along with the [AI Agent Reference](../../AI-AGENT-REFERENCE.md) grammar if using a web LLM), and prompt for the specific artifact you need: a dbt model, a DLT pipeline, an Airflow DAG, a test suite.

4. **Review the output against the spec.** The spec is your acceptance criteria. Every arrow should have a corresponding implementation. Every `(required)` should have a not-null check. Every NL transform should appear as a TODO or a best-effort implementation.

5. **Iterate.** Fix issues in the spec or the generated code, re-run, converge.

The important insight is that you are not asking the AI to *invent* a pipeline from a vague description. You are asking it to *translate* a precise specification into platform-specific code. That is a fundamentally easier task for a language model, and it produces fundamentally better results.

---

## Metadata Conventions as Codegen Hints

The real power for code generation comes from Satsuma's metadata conventions. These are vocabulary tokens in `( )` that an LLM interprets semantically. They are not reserved keywords, so the grammar never needs to change when you add new patterns.

### Dimensional modelling

```stm
schema dim_customer (dimension, conformed, scd 2,
    natural_key customer_id,
    track {email, phone, segment},
    ignore {last_login_ts}) {
  customer_id  STRING  (pk, required)
  email        STRING  (pii, format email)
  segment      STRING  (enum {enterprise, mid_market, smb})
}
```

Tokens like `dimension`, `scd 2`, `track`, and `ignore` tell an AI agent exactly how to generate the target DDL (including surrogate keys and validity columns it should infer) and how to build the SCD merge logic. See the [Kimball conventions](../data-modelling/kimball/README.md) for the full token vocabulary.

### Data Vault

```stm
schema hub_customer (hub, business_key customer_id) {
  customer_id  STRING  (required)
}

schema sat_demographics (satellite, parent hub_customer, scd 2) {
  email    STRING  (pii)
  segment  STRING
}
```

Hub, satellite, and link tokens give an AI agent enough context to generate hash key derivations, load-date columns, and record-source tracking without you specifying any of that boilerplate. See the [Data Vault conventions](../data-modelling/datavault/README.md).

### Merge strategy

```stm
mapping 'load customers' (merge upsert, match_on customer_id) {
  source { `stg_customers` }
  target { `dim_customer` }

  customer_id -> customer_id
  email -> email { trim | lowercase }
}
```

The `merge upsert` and `match_on` tokens translate directly to platform-specific merge statements. An AI agent reading this spec will generate a `MERGE INTO` for Snowflake, an `apply_changes()` for Databricks DLT, or a dbt incremental model with the correct unique key. See the [Merge strategy conventions](../conventions-for-merge-strategy/README.md).

### Governance

```stm
schema customer_pii (
    owner "data-governance-team",
    classification confidential,
    compliance {GDPR, CCPA}) {
  ssn         STRING  (pii, encrypt AES-256-GCM)
  email       STRING  (pii, format email)
  full_name   STRING  (pii)
}
```

Governance tokens like `pii`, `classification`, `owner`, and `compliance` map to catalog entries, column-level security policies, and lineage metadata. They travel with the spec rather than living in a separate governance tool that drifts out of sync.

---

## Scaffold Generation: What AI Produces from a Satsuma Spec

You do not need to write detailed prompts for each platform. A well-annotated Satsuma spec contains enough information for an AI agent to generate the right scaffold. Here is what that looks like across common targets.

### Databricks Lakehouse (Delta Live Tables)

The AI reads schema definitions, arrow mappings, merge strategy tokens, and SCD metadata. It generates a DLT notebook with `@dlt.table` or `@dlt.view` decorators, `apply_changes()` calls for SCD/merge patterns, and expectation constraints derived from `(required)`, `(pk)`, and `(enum)` tokens. NL transforms become inline comments describing the logic to implement. You verify that the table names, column types, and merge keys match the spec.

### Snowflake + dbt

The AI reads the same spec and generates dbt SQL models: a staging model with column renames and type casts from the arrows, an intermediate or mart model with the transform logic, and a `schema.yml` with tests. `(merge upsert)` becomes a dbt incremental model with `unique_key`. `(scd 2)` becomes a dbt snapshot configuration. You verify the ref chain, the incremental strategy, and the test coverage.

### Airflow DAGs

The AI generates a DAG definition with task dependencies derived from the mapping's source-target relationships and any `import` chains in the spec. Each mapping becomes a task (or task group). Merge strategy tokens inform whether a task does a full refresh or an incremental load. You verify the dependency graph, schedule, and operator choices.

### Azure Data Factory / Mapping Data Flows

The AI generates a Data Flow JSON or ARM template with source and sink datasets matching the Satsuma schemas, column mappings matching the arrows, and derived columns for transform pipelines. `(merge upsert)` maps to an Alter Row transformation. You verify the linked service references and the column-level mapping accuracy.

### Azure Logic Apps

For event-driven integration patterns, the AI generates a Logic App workflow definition with triggers, HTTP actions, and data transformation steps derived from the mapping arrows. Schema definitions inform the request/response schemas for connectors. You verify the connector configuration and authentication setup.

### PySpark Notebooks

The AI generates a PySpark script with `DataFrame` reads matching the source schemas, column-level transformations matching the arrows (using `withColumn`, `select`, and UDFs), and a write step matching the target schema and merge strategy. NL transforms become function stubs with docstrings pulled from the spec. You verify the read/write paths, partitioning, and shuffle behavior.

### What about other platforms?

The same principle applies to any platform with a code-based configuration layer. Kafka Connect configurations, Fivetran transformations, Informatica mapplets, Talend jobs, SSIS packages — if the platform accepts a structured definition, an AI agent can generate it from a Satsuma spec. The spec is platform-agnostic; the generated code is platform-specific.

The key is that you are not locked into a single target. The same `.stm` file that generates a dbt model today can generate a Databricks DLT pipeline tomorrow if you migrate platforms. The spec is the durable artifact; the generated code is disposable.

### The common pattern

Across all platforms, the workflow is the same. The AI reads:
- **Schemas** for DDL and column types
- **Arrows** for field-level transformation logic
- **Metadata tokens** for merge strategy, SCD behavior, constraints, and governance
- **NL transforms** for complex logic it either implements or flags as TODOs
- **Notes** for business context that informs implementation choices

You verify the generated code against the spec. Every arrow should map to a transformation. Every metadata token should map to a platform feature. Every gap should be clearly marked.

---

## Data Quality Test Generation

A Satsuma spec is also a test specification. The metadata tokens you already write for documentation purposes map directly to data quality assertions.

### Constraint-to-test mappings

| Satsuma metadata | Generated test | Frameworks |
|-----------------|---------------|------------|
| `(required)` | Not-null assertion | dbt `not_null`, Great Expectations `expect_column_values_to_not_be_null`, SodaSQL `missing_count = 0` |
| `(pk)` | Uniqueness + not-null | dbt `unique` + `not_null`, GE `expect_column_values_to_be_unique` |
| `(enum {a, b, c})` | Accepted-values test | dbt `accepted_values`, GE `expect_column_values_to_be_in_set` |
| `(format email)` | Regex pattern match | GE `expect_column_values_to_match_regex` |
| `(ref dim.field)` | Referential integrity | dbt `relationships`, GE `expect_column_values_to_be_in_type_list` with lookup |

### Transform-derived tests

Beyond field metadata, the mapping arrows themselves imply tests:

```stm
mapping 'load orders' (merge append) {
  source { `raw_orders` }
  target { `stg_orders` }

  order_id -> order_id
  amount_usd -> amount_cents { * 100 | round }
  status -> status {
    map {
      A: "active"
      C: "cancelled"
      default: "unknown"
    }
  }
}
```

From this spec, an AI agent can infer:

- **Row-count assertion** — `stg_orders` row count should equal `raw_orders` row count (because `merge append` with no filter means every row flows through).
- **Value-range assertion** — `amount_cents` should always be an integer (the `round` step eliminates decimals).
- **Accepted-values assertion** — `status` can only be `"active"`, `"cancelled"`, or `"unknown"` (derived from the value map plus default).

### Prompting for test generation

When you feed a spec to an AI agent, you can ask specifically for tests:

> Generate a dbt `schema.yml` with tests for every schema in this Satsuma spec. Use `not_null` for `(required)` fields, `unique` for `(pk)` fields, `accepted_values` for `(enum)` fields, and `relationships` for `(ref)` fields. For each mapping, add a row-count test comparing source and target.

The spec gives the AI enough structured information to produce comprehensive test coverage on the first pass, rather than the sparse handful of tests you get when working from a spreadsheet or verbal description.

---

## Sample Test Data Generation

Good test data is hard to create manually. Satsuma specs contain enough semantic information for an AI agent to generate realistic fixtures.

### What the AI reads

- **`(enum {retail, business, government})`** — the AI generates rows with a realistic distribution across these values, not random strings.
- **`(format email)`** — the AI generates plausible email addresses, not `test123`.
- **`(pii)`** — the AI generates obviously fake but structurally valid PII (fake SSNs, synthetic names) rather than copying production patterns.
- **Data types** — `DECIMAL(12,2)` tells the AI the precision and scale. `TIMESTAMPTZ` tells it to include timezone offsets.
- **`note { }` blocks** — descriptions like *"42% US format with parentheses, 31% dot-separated"* give the AI a distribution to follow when generating phone numbers.

### Value maps as fixture blueprints

A value map is a complete enumeration of valid transformations. It doubles as a test fixture specification:

```stm
region_code -> region_name {
  map {
    NA: "North America"
    EU: "Europe"
    AP: "Asia Pacific"
    default: "Other"
  }
}
```

An AI agent can generate test rows covering every branch (including the `default` path) and verify that the mapping produces the expected output for each.

### Prompting for test data

> Generate 50 rows of sample data for the `raw_customers` schema in this Satsuma spec. Respect the `enum` values, `format` constraints, and data types. Use the `note` descriptions to guide realistic distributions. Mark PII fields with obviously synthetic values.

This produces better test data than generic mock generators because the spec carries domain context that the AI can use.

### Edge cases from notes

Notes are particularly valuable for test data. When a BA writes:

```stm
schema legacy_phones {
  phone_nbr  VARCHAR(50) (
    note """
    No consistent format:
    - **42%** `(555) 123-4567` — US with parentheses
    - **31%** `555.123.4567` — dot-separated
    - **15%** `+15551234567` — already E.164
    - **8%** `5551234567` — raw 10-digit
    - **4%** other (international, extensions, garbage)
    """
  )
}
```

An AI agent can generate test rows that cover every format variant, including the 4% garbage cases that would otherwise only surface in production. The note is structured enough to drive fixture generation, but flexible enough to capture real-world messiness.

---

## Governance Metadata Generation

Governance tokens in a Satsuma spec are not just documentation. They are machine-readable signals that an AI agent can translate into platform-specific governance artifacts.

### PII and classification

```stm
schema customer_record (classification confidential, compliance {GDPR}) {
  customer_id    STRING  (pk, required)
  email          STRING  (pii, format email)
  date_of_birth  DATE    (pii)
  segment        STRING
}
```

From this spec, an AI agent can generate:

- **Column-level security policies** — Snowflake masking policies or Databricks column masks on fields tagged `(pii)`.
- **Data catalog entries** — table-level classification as `confidential`, column-level PII tags, compliance framework associations.
- **Access control templates** — role-based access policies where `(pii)` columns require elevated permissions.

### Ownership and lineage

```stm
schema dim_customer (
    dimension, owner "analytics-team",
    classification internal) {
  // fields...
}

mapping 'crm to dim' (merge upsert, match_on customer_id) {
  source { `stg_crm` }
  target { `dim_customer` }
  // arrows...
}
```

The `owner` token maps to data catalog ownership entries. The mapping's source-target relationship maps to OpenLineage events or Purview lineage edges. An AI agent can generate:

- **OpenLineage facets** — dataset facets with ownership, schema, and data quality metadata derived from the spec.
- **Purview or Collibra imports** — bulk metadata uploads with classification, ownership, and lineage pre-populated.
- **Tag propagation rules** — if a source field is `(pii)`, every target field it maps to should inherit the tag.

### Compliance documentation

When a spec declares `(compliance {GDPR, CCPA})`, an AI agent can generate a data processing inventory entry documenting what personal data is collected, where it flows, and what controls are in place. The spec itself becomes the primary evidence artifact for compliance reviews.

### Governance as code

The pattern here is the same as infrastructure-as-code: governance metadata lives in the same version-controlled file as the mapping it governs. When a field's classification changes from `internal` to `confidential`, the change shows up in a PR diff. When a new PII field is added, the reviewer can immediately see whether it has the required `(encrypt)` token. There is no separate governance tool to keep in sync, no manual catalog update to forget.

---

## Why Satsuma Produces Better AI Results Than Other Spec Formats

You might ask: why not just give the AI a well-structured YAML file, a JSON schema, or a detailed Confluence page? You can, and it will work to some degree. But Satsuma produces consistently better results for several reasons.

**Constrained grammar.** Satsuma has three delimiter types with mutually exclusive roles: `( )` for metadata, `{ }` for structural content, `" "` for natural language. An AI model cannot confuse a business rule with a field name or a comment with a constraint. In YAML or JSON, everything is a string and the model must infer roles from context.

**Semantic tokens.** Tokens like `pk`, `scd 2`, `merge upsert`, and `pii` are compact, unambiguous signals. They carry more information per token than a paragraph of prose and they are consistent across every spec in your organization. A model trained on thousands of data engineering conversations already knows what these terms mean.

**Scoped natural language.** Complex logic lives inside `" "` strings that are syntactically bound to a specific arrow or block. The AI knows exactly which transformation the NL describes. In a spreadsheet, a "Notes" column is disconnected from the field it refers to, and an AI must guess the association.

**Extensibility without grammar changes.** When your team adopts a new convention (say, `(retention 90d)` for data retention policies), you just start using it. No schema changes, no parser updates, no tooling modifications. The AI interprets the new token from context, and you document the convention for consistency.

**Version control.** `.stm` files diff cleanly. When a spec changes, you can see exactly which arrows, metadata, or transforms were modified. An AI agent reviewing a PR can compare the old and new specs and flag implementation code that needs updating. Try doing that with an Excel file.

**Token efficiency.** Satsuma specs are 3-8x more compact than equivalent spreadsheets or YAML documents. This means larger mapping inventories fit within an AI model's context window, enabling cross-mapping analysis, lineage tracing, and consistency checking that would exceed token limits with verbose formats.

---

## Human Verification and LLM-as-Judge Patterns

AI-generated code still needs review. The Satsuma spec gives you a structured checklist to review against, rather than relying on your memory of scattered requirements.

### Spec-driven code review

Walk through the generated code with the spec open beside it:

1. **Every arrow has an implementation.** Each `->` in the spec should correspond to a column transformation in the generated code. Missing arrows mean missing logic.
2. **Every metadata token has an effect.** `(required)` should produce a not-null constraint or test. `(pk)` should produce a uniqueness constraint. `(merge upsert)` should produce merge logic, not an overwrite.
3. **Every NL transform is addressed.** Quoted strings should appear as TODO comments, function stubs, or best-effort implementations. Nothing should be silently dropped.
4. **Platform conventions are followed.** The generated code should match your team's naming conventions, project structure, and deployment patterns.

### LLM-as-judge

You can use a second AI pass to verify the first:

> Here is a Satsuma spec and the dbt model generated from it. For every arrow in the spec, verify that the generated SQL implements the transformation correctly. For every metadata token, verify that the corresponding test or constraint exists. List any gaps or mismatches.

This works because the spec is the unambiguous reference. The judge model compares structured intent (the spec) against implementation (the generated code) rather than trying to infer intent from prose.

### Convention adherence checking

If your organization has documented Satsuma conventions (naming patterns, required metadata tokens, governance rules), you can prompt an AI agent to check a spec for compliance:

> Check this Satsuma spec against our conventions: every dimension must have `(scd N)` declared, every PII field must have `(encrypt)`, every mapping must have a `(merge)` strategy. List any violations.

This is lightweight governance that runs as part of your normal review process.

### Handling NL transforms in review

Natural-language transforms deserve special attention. When a spec contains:

```stm
phone_nbr -> phone {
  "Extract all digits. If 11 digits starting with 1, treat as US.
   If 10 digits, assume US country code +1. Format as E.164.
   For other patterns, attempt to determine country from country_cd.
   If unparseable, set null and log warning with original value."
}
```

An AI agent might generate a reasonable implementation, or it might produce something that looks right but mishandles edge cases. Your review checklist for NL transforms:

1. **Is the intent fully captured?** Does the generated code handle every case described in the NL string?
2. **Are edge cases explicit?** The "if unparseable" clause should have a corresponding code path, not just a generic exception handler.
3. **Is the TODO visible?** If the AI could not implement the logic confidently, it should leave a TODO comment containing the original NL text, not silently skip it.
4. **Does it need a unit test?** NL transforms are the highest-risk part of any generated pipeline. If the AI generated an implementation, ask it to also generate targeted unit tests for that specific transform.

---

## Getting Started

If you are ready to adopt Satsuma in your data engineering workflow, here is a practical path.

**Step 1: Learn the syntax.** Work through the [BA Tutorial](ba-tutorial.md). It takes about 30 minutes and covers everything you need to read and write specs.

**Step 2: Pick a real mapping.** Choose a mapping you are about to implement (or recently implemented). Convert it to a `.stm` file. This is the fastest way to build intuition for what Satsuma captures well and where you need conventions.

**Step 3: Add implementation metadata.** Enrich the spec with the tokens your platform needs: merge strategy, SCD type, grain, governance flags. Use the convention docs as references:
- [Kimball conventions](../data-modelling/kimball/README.md) for dimensional models
- [Data Vault conventions](../data-modelling/datavault/README.md) for vault patterns
- [Merge strategy conventions](../conventions-for-merge-strategy/README.md) for load patterns

**Step 4: Generate a scaffold.** Feed the spec to your AI coding agent and ask for a platform-specific implementation. Compare the output against what you would have written by hand. Note what the AI got right, what it missed, and what metadata you could add to improve the next run.

**Step 5: Generate tests.** Ask the AI to generate a test suite from the same spec. Check that every constraint token maps to a test assertion. This is often where the ROI becomes obvious: comprehensive test generation from a spec takes minutes instead of hours.

**Step 6: Version control the spec.** Commit the `.stm` file alongside your implementation code. It becomes the living contract that connects business intent to running pipelines. When requirements change, the spec changes first, and the implementation follows.

**Step 7: Share with your team.** The [Using Satsuma without CLI](../using-satsuma-without-cli.md) guide shows how anyone on the team can work with Satsuma files using just a text editor and a web LLM. The [CLI reference](../../SATSUMA-CLI.md) covers the full toolchain when you are ready for automated validation, lineage tracing, and structural extraction.

---

## Where to Go Next

- **[BA Tutorial](ba-tutorial.md)** — the complete syntax walkthrough, if you skipped it
- **[Kimball conventions](../data-modelling/kimball/README.md)** — dimensional modelling tokens and patterns
- **[Data Vault conventions](../data-modelling/datavault/README.md)** — hub, satellite, and link patterns
- **[Merge strategy conventions](../conventions-for-merge-strategy/README.md)** — upsert, append, soft delete, full refresh
- **[CLI reference](../../SATSUMA-CLI.md)** — the 16-command CLI for validation, extraction, and lineage
- **[Using Satsuma without CLI](../using-satsuma-without-cli.md)** — working with web LLMs and no installation
