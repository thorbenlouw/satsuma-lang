# Feature 21 — Convention Documentation: Merge Strategy, Governance, JSON Path, Reports & Models

> **Status: NOT STARTED**

## Goal

Write four convention documentation guides that show data engineers and business analysts how to use existing Satsuma metadata tokens for common patterns. Each guide follows the established format in `docs/` — token dictionaries, examples, LLM guidance — and no grammar changes are required.

A top-level `HOW-DO-I.md` index makes these (and existing) guides discoverable as question-answer pairs.

---

## Problem

Satsuma's `( )` metadata system already supports arbitrary vocabulary tokens, and the grammar doesn't need to change for any of these patterns. But without documented conventions and examples, users have to guess which tokens to use, how to combine them, and what tooling should infer. The data-modelling docs (`docs/data-modelling/`) and format conventions (`docs/conventions-for-schema-formats/`) proved that detailed convention docs with canonical examples are what make the token system practical.

Four common patterns are currently undocumented:

1. **Merge/upsert strategy** — how data should land in the target (upsert, append, soft-delete, full-refresh)
2. **Governance tags** — ownership, classification, retention, masking, compliance
3. **JSON path field references** — `jsonpath` tokens paralleling existing `xpath`
4. **Reports and ML models as pipeline consumers** — schemas with `(report)` or `(model)` metadata

---

## Design Principles

1. **Convention, not grammar.** Every pattern uses existing `( )` metadata. No new keywords, no parser changes, no tree-sitter work.
2. **Follow the established doc format.** Each guide has the same structure as the existing convention docs: why the pattern matters, token dictionary, guidelines, how NL helps, and a complete valid `.stm` example.
3. **Include LLM guidance.** Each guide tells an LLM interpreter exactly what to infer from the tokens — what columns to add, what SQL to generate, what validation to apply.
4. **Add canonical examples.** Each guide includes at least one new `.stm` file in `examples/` that the parser can validate and that serves as a golden fixture.
5. **BA-friendly.** A business analyst should be able to read the example and understand the intent without knowing the underlying platform.

---

## Deliverables

### D1. `docs/conventions-for-merge-strategy/` — Merge and Upsert Conventions

How to declare load strategy on mapping blocks using `( )` metadata.

**Directory:** `docs/conventions-for-merge-strategy/`

**Files:**
- `README.md` — convention guide
- `LLM-Guidelines.md` — interpretation rules for codegen

**Token dictionary:**

| Token | Applies to | Meaning |
|-------|-----------|---------|
| `merge upsert` | Mapping metadata | Insert new, update existing |
| `merge append` | Mapping metadata | Insert-only, every record is a new row |
| `merge soft_delete` | Mapping metadata | Mark deleted records rather than removing |
| `merge full_refresh` | Mapping metadata | Truncate and reload |
| `match_on <field>` | Mapping metadata | Business key for matching (required for upsert, soft_delete) |
| `on_match <action>` | Mapping metadata | What to do when a match is found (default: `update`) |
| `on_no_match <action>` | Mapping metadata | What to do when no match is found (default: `insert`) |
| `delete_flag <field>` | Mapping metadata | Boolean field for soft deletes |
| `delete_timestamp <field>` | Mapping metadata | Timestamp field for soft deletes |

**Example patterns to cover:**
- Upsert (insert + update on match)
- Append-only (event log / immutable stream)
- Soft delete (flag + timestamp)
- Full refresh with safety-rail note
- Composite match keys (`match_on {customer_id, effective_date}`)

**Canonical example:** `examples/merge-strategies.stm` — a single file demonstrating all four patterns in one coherent scenario.

**LLM guidance should cover:**
- How to generate platform-specific MERGE/INSERT/UPDATE/DELETE from tokens
- Default behaviors when `on_match` or `on_no_match` are omitted
- How `merge` interacts with `scd` tokens on target schemas
- Validation rules (e.g. `match_on` is required for upsert but not for append)

---

### D2. `docs/conventions-for-governance/` — Governance Metadata Conventions

How to annotate schemas and fields with ownership, classification, retention, masking, and compliance metadata.

**Directory:** `docs/conventions-for-governance/`

**Files:**
- `README.md` — convention guide
- `LLM-Guidelines.md` — interpretation rules for policy enforcement and codegen

**Token dictionary:**

Schema-level tokens:

| Token | Meaning | Example |
|-------|---------|---------|
| `owner "<team>"` | Owning team or individual | `owner "data-platform-team"` |
| `steward "<person>"` | Data steward contact | `steward "jane.doe@company.com"` |
| `retention <policy>` | Data retention policy | `retention years 7 after last_activity_date` |
| `compliance {standards}` | Applicable compliance frameworks | `compliance {GDPR, CCPA, HIPAA}` |

Field-level tokens:

| Token | Meaning | Example |
|-------|---------|---------|
| `classification <level>` | Data classification tier | `classification confidential` |
| `mask <strategy>` | Display masking strategy | `mask partial_email`, `mask last_four` |
| `pii` | Personally identifiable information (already in use) | `(pii)` |
| `encrypt <algorithm>` | Encryption requirement (already in use) | `encrypt AES-256-GCM` |

**Example patterns to cover:**
- Field-level PII + classification + masking
- Schema-level ownership and stewardship
- Retention policies with temporal anchors
- Multi-framework compliance declarations
- Custom / org-specific tokens (demonstrating extensibility)

**Canonical example:** `examples/governance.stm` — a customer-360 schema with full governance annotations plus an org-specific finance schema showing custom tokens.

**LLM guidance should cover:**
- How to generate column-level security policies from `classification` + `mask`
- How to generate retention DDL or lifecycle rules from `retention`
- How `pii` + `classification` + `encrypt` compose (they are independent concerns)
- How to validate governance completeness (e.g. all `pii` fields should have `classification`)
- How org-specific tokens extend the system without conflicting

**Note:** Reference `examples/filter-flatten-governance.stm` which already demonstrates `classification` and `retention` tokens in context.

---

### D3. `docs/conventions-for-schema-formats/json/` — JSON Path Conventions

How to map JSON source fields using `jsonpath` metadata tokens, paralleling the existing `xpath` convention.

**Directory:** `docs/conventions-for-schema-formats/json/`

**Files:**
- `conventions.md` — following the established format in `docs/conventions-for-schema-formats/`

**Token dictionary:**

| Token | Applies to | Meaning | Example |
|-------|-----------|---------|---------|
| `format json` | Schema metadata | Source is JSON | `(format json)` |
| `jsonpath "<expr>"` | Field or record metadata | JSONPath expression to extract this value | `(jsonpath "$.order.id")` |

**Example patterns to cover:**
- Simple field extraction (`$.order.id`)
- Nested object traversal (`$.order.customer.email`)
- Array iteration on `list_of record` (`$.order.line_items[*]`)
- Relative paths inside array-iterated records (`$.sku` within context of `$[*]`)
- Grabbing a whole subtree as a JSON blob (`$.order.metadata`)

**Canonical example:** `examples/json-api-to-parquet.stm` — a REST API response mapped to a flat Parquet target, demonstrating all five patterns. Should be directly comparable to `examples/xml-to-parquet.stm` which demonstrates the `xpath` equivalent.

**Convention doc should cover:**
- How `jsonpath` parallels `xpath` — same role, different source format
- When to use `jsonpath` vs relying on Satsuma's native `record` nesting (guideline: use `jsonpath` when the JSON structure doesn't map cleanly to the target, or when you need to document the exact extraction path for codegen)
- How an LLM interpreter should resolve paths at parse time

---

### D4. `docs/conventions-for-reports-and-models/` — Reports and ML Models as Pipeline Consumers

How to declare reports, dashboards, and ML models as schemas with `(report)` or `(model)` metadata tokens so they appear in lineage and dependency graphs.

**Directory:** `docs/conventions-for-reports-and-models/`

**Files:**
- `README.md` — convention guide
- `LLM-Guidelines.md` — interpretation rules

**Token dictionary:**

Schema-level tokens:

| Token | Meaning | Example |
|-------|---------|---------|
| `report` | This schema represents a report or dashboard | `schema weekly_sales (report) { }` |
| `model` | This schema represents an ML model | `schema churn_predictor (model) { }` |
| `source {schemas}` | Upstream schemas this consumer depends on | `source {fact_orders, dim_customer}` |
| `tool <name>` | BI or ML platform | `tool looker dashboard_id "abc"` |
| `refresh schedule "<cron>"` | How often this consumer is updated | `refresh schedule "Monday 06:00 UTC"` |
| `registry <platform>` | Model registry reference | `registry mlflow experiment "churn-v3"` |

**Example patterns to cover:**
- Dashboard/report with source dependencies and schedule
- ML model with feature descriptions, output schema, and registry reference
- Report with governance tokens composed (`report` + `owner` + `compliance`)
- Minimal report (just `(report, source {x, y})` and a `note`)

**Canonical example:** `examples/reports-and-models.stm` — a BI dashboard and ML model consuming from existing data-modelling examples, demonstrating lineage integration.

**LLM guidance should cover:**
- How `(report)` and `(model)` schemas differ from regular schemas (they are consumers, not producers — they appear as leaf nodes in lineage graphs)
- How `source {schemas}` maps to lineage edges
- How to generate dependency documentation or impact analysis from these declarations
- How report/model schemas compose with governance tokens

---

### D5. `HOW-DO-I.md` — Top-Level Question Index

A discoverable index at the repo root that frames Satsuma capabilities as questions and links to the relevant guide.

**Format:** Each entry is a question a user might ask, with a one-line answer and a link to the detailed doc. Grouped by category. Covers both existing docs and the four new ones.

**Categories:**
- Data Modelling (links to `docs/data-modelling/`)
- Load Strategy (links to D1)
- Governance (links to D2)
- Schema Formats (links to `docs/conventions-for-schema-formats/` and D3)
- Reports & Models (links to D4)
- Tooling (links to CLI reference, LSP, linter)
- Getting Started (links to tutorials, spec, examples)

---

### D6. `docs/tutorials/data-engineer-tutorial.md` — Data Engineer Tutorial

A practical guide for data engineers on using Satsuma specs with AI agents to generate implementation scaffolds, data quality tests, sample test data, and governance metadata.

**Location:** `docs/tutorials/data-engineer-tutorial.md`

**Tone and style:** Matches the conversational, practical style of `docs/tutorials/ba-tutorial.md`. Builds understanding incrementally with short Satsuma snippets (not detailed implementation code). The focus is on *workflow* — how a DE combines Satsuma + documented conventions + a capable AI model to go from intent to implementation.

**Sections to cover:**

1. **The problem Satsuma solves for DEs** — spreadsheet specs are lossy; AI models hallucinate structure from ambiguous inputs; Satsuma gives a constrained, parseable, version-controlled contract that AI tools achieve much better implementation adherence to than loose documents.

2. **The Satsuma + AI workflow** — the core loop:
   - Write (or receive from a BA) a Satsuma spec with schemas, mappings, and metadata conventions
   - Add LLM-Guidelines or `note { }` blocks describing org-specific conventions and context
   - Feed the spec + conventions to an AI agent and ask for scaffold generation
   - Review, verify, iterate

3. **Metadata conventions as codegen hints** — how tokens like `(dimension, scd 2)`, `(merge upsert, match_on ...)`, `(hub, business_key ...)` give the AI enough semantic context to generate the right patterns. Reference the convention docs in `docs/data-modelling/` and the new convention docs from D1–D4.

4. **Scaffold generation examples** — brief descriptions (not full code) of what an AI generates from a Satsuma spec for each platform:
   - Databricks Lakehouse Declarative Pipelines (DLT)
   - Snowflake + dbt models
   - Airflow DAGs
   - Azure Data Factory Mapping Data Flows
   - Azure Logic Apps
   - PySpark notebooks
   - For each: what the AI reads from the spec, what it generates, what the DE needs to verify

5. **Data quality test generation** — how the AI infers tests from Satsuma metadata:
   - `(required)` → not-null tests
   - `(pk)` → uniqueness tests
   - `(enum {a, b, c})` → accepted-values tests
   - `(ref dim.field)` → referential integrity tests
   - Transform chains → row-count and value-range assertions
   - Targets: Great Expectations, SodaSQL, dbt tests
   - The AI already knows these frameworks; the Satsuma spec tells it *what to test*

6. **Sample test data generation** — how `enum`, `format`, `note { }` descriptions, and value maps give the AI enough context to generate realistic fixture data that exercises edge cases.

7. **Governance metadata generation** — how `(pii)`, `(classification)`, `(owner)`, `(compliance)` tokens map to external governance systems: OpenLineage events, data catalog entries, column-level security policies.

8. **Why Satsuma produces better results than other spec formats** — the key advantages:
   - Constrained grammar means AI outputs are structurally valid and reviewable
   - Metadata tokens carry semantic intent, not just labels
   - NL descriptions are scoped to specific fields/transforms, not free-floating
   - The `( )` system is extensible — org conventions travel with the spec
   - Version control gives diff-able history of intent changes

9. **Human verification and LLM-as-judge patterns** — the need for human review of AI-generated scaffolds. Patterns:
   - DE reviews generated code against the Satsuma spec (the spec is the acceptance criteria)
   - LLM-as-judge: feed the generated code + original spec to a second AI and ask "does this implementation match the spec?"
   - Checklist: NL transforms become TODO comments — a human must verify each one
   - Convention adherence: does the generated code honour the metadata tokens?

10. **Getting started** — practical first steps for a DE adopting Satsuma on an existing project.

**Cross-references:** Link to the BA tutorial for syntax basics. Link to convention docs for metadata semantics. Link to CLI reference for validation and lineage commands. Link to `docs/using-satsuma-without-cli.md` for web-LLM workflows.

---

### D7. `docs/tutorials/integration-engineer-tutorial.md` — Integration Engineer Tutorial

A practical guide for integration engineers on using Satsuma specs with AI agents to design and scaffold enterprise integrations.

**Location:** `docs/tutorials/integration-engineer-tutorial.md`

**Tone and style:** Same as D6 — conversational, practical, incremental. Brief Satsuma snippets, not detailed implementation code. Focus on workflow.

**Sections to cover:**

1. **The problem Satsuma solves for IEs** — integration specs live in Confluence, Visio, vendor-specific tools, and email threads. Each platform (MuleSoft, Workato, Logic Apps) has its own mapping format that doesn't travel. Satsuma is a portable, version-controlled mapping contract that works across all integration platforms and that AI tools can read reliably.

2. **The integration landscape** — brief orientation to where Satsuma fits in the stack:
   - ESBs and iPaaS (MuleSoft, Boomi, Workato, Zapier, Make)
   - Message queues and pub/sub (Kafka, RabbitMQ, Azure Service Bus, Google Pub/Sub, AWS SQS/SNS)
   - API gateways and microservices (REST, GraphQL, gRPC)
   - Legacy middleware (webMethods, TIBCO, IBM MQ)
   - Satsuma is the *spec layer* above all of these — it describes what data moves, not how

3. **The Satsuma + AI workflow for integrations** — the core loop:
   - Document the source and target systems as Satsuma schemas with format-specific metadata (`xpath`, `jsonpath`, `format`, `encoding`)
   - Describe the mapping logic in mapping blocks with transforms and NL descriptions
   - Add integration-specific metadata: `(merge append)`, `(format json)`, protocol hints
   - Feed to an AI agent for scaffold generation targeting the specific platform

4. **Format-specific metadata conventions** — how existing conventions handle complex formats:
   - XML with `(xpath ...)` and namespace declarations
   - JSON with `(jsonpath ...)`
   - COBOL copybooks with `(pic, offset, length, encoding comp-3)`
   - EDI with segment/qualifier filters
   - Protobuf with tag-based field references
   - Reference the convention docs in `docs/conventions-for-schema-formats/`

5. **Scaffold generation examples** — brief descriptions of what an AI generates from a Satsuma spec for each platform:
   - MuleSoft DataWeave transforms
   - Workato recipes / connector mappings
   - Zapier / Make webhook + transform flows
   - Azure Logic Apps workflow definitions
   - AWS Step Functions + Lambda transform skeletons
   - Apache Camel route definitions
   - Spring Integration / Apache NiFi flow configs
   - For each: what the AI reads from the spec, what it generates, what the IE needs to verify

6. **Message-oriented patterns** — how Satsuma handles:
   - Request/response pairs (two mappings, one per direction)
   - Event schemas with versioning metadata
   - Dead-letter and error-handling annotations via `note { }` blocks
   - Idempotency keys and deduplication hints in metadata

7. **API contract alignment** — how Satsuma specs complement OpenAPI/AsyncAPI:
   - Satsuma describes the *mapping logic* between systems
   - OpenAPI/AsyncAPI describes the *contract* of a single system
   - Together they cover the full integration picture
   - AI tools can cross-reference both to generate adapters

8. **Why Satsuma produces better results than vendor-specific tools** — the key advantages:
   - Portable across platforms — switch from MuleSoft to Workato without rewriting specs
   - AI models already know these platforms deeply; Satsuma gives them structured intent
   - NL descriptions carry business context that platform-specific GUIs discard
   - Version-controlled specs survive platform migrations and vendor changes

9. **Human verification and testing patterns** — same themes as D6 but integration-flavoured:
   - Message-level test data generation from Satsuma schemas
   - Contract testing: does the generated adapter honour the Satsuma mapping?
   - LLM-as-judge for integration correctness
   - Regression: re-generate scaffolds after spec changes and diff

10. **Getting started** — practical first steps for an IE adopting Satsuma.

**Cross-references:** Link to the BA tutorial for syntax basics. Link to schema-format convention docs. Link to examples (`xml-to-parquet.stm`, `edi-to-json.stm`, `protobuf-to-parquet.stm`, `cobol-to-avro.stm`). Link to `docs/using-satsuma-without-cli.md` for web-LLM workflows.

---

## Acceptance Criteria

1. All four convention directories exist with their documented files.
2. All four canonical `.stm` examples parse cleanly with `satsuma validate`.
3. Each convention doc includes a complete token dictionary table.
4. Each convention doc that warrants it includes an `LLM-Guidelines.md`.
5. `HOW-DO-I.md` exists at the repo root with links to all existing and new docs.
6. `ROADMAP.md` "Convention Docs Still To Write" section is updated to reflect completion.
7. No grammar or parser changes — all patterns use existing `( )` metadata syntax.
8. `examples/` index in relevant READMEs updated to include new example files.
9. `docs/tutorials/data-engineer-tutorial.md` exists and covers all sections listed in D6.
10. `docs/tutorials/integration-engineer-tutorial.md` exists and covers all sections listed in D7.
11. All tutorial cross-references and site links point to the correct paths under `docs/tutorials/`.

---

## Non-Goals

- Grammar changes, new keywords, or parser modifications.
- CLI commands for governance validation or merge-strategy codegen (future tooling, tracked separately).
- Linter rules for these conventions (future Feature 06 Phase 2 work).
- Exhaustive coverage of every possible token combination — the docs establish the pattern; users extend it.
- Detailed implementation code in the tutorials — they describe workflow and intent, not runnable code.

---

## Implementation Order

The docs are independent and can be written in any order or in parallel. Suggested sequence based on value and complexity:

1. **D5: HOW-DO-I.md** — create the index skeleton first, linking to existing docs and using placeholder links for the new ones. Update as each doc lands. **DONE.**
2. **D6: Data Engineer Tutorial** — highest impact; establishes the Satsuma + AI workflow pattern that D7 mirrors.
3. **D7: Integration Engineer Tutorial** — parallels D6 for the integration audience.
4. **D1: Merge strategy** — highest user demand, most codegen value, clearest token semantics.
5. **D2: Governance** — builds on existing `pii`/`encrypt`/`classification` usage already in examples.
6. **D3: JSON path** — straightforward parallel to existing `xpath`; smallest scope.
7. **D4: Reports and models** — newest concept, benefits from the others being in place first.
