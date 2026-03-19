# STM in 10 Lessons (+ 4 Playbooks)

A structured learning path that takes you from first principles to real-world delivery with STM — Structured Transform Markup. The 10 core lessons cover every language feature and the key workflows. The 4 playbook extensions are persona-specific guides for the roles most likely to work with STM day-to-day.

---

## Who This Is For

The core lessons target **technical business analysts and data/integration engineers** — people who can read code but are not necessarily language specialists. Each lesson builds on the previous one and uses a single running example (a legacy CRM → Snowflake customer migration) so you are always working with familiar material.

The playbook extensions (Lessons 11–14) are self-contained guides for specific roles. They assume you have covered the core lessons, or at least skimmed Lessons 1–5.

---

## Running Example

All core lessons (1–7) use the same scenario: **Acme Corp migrating customer records from a legacy SQL Server CRM to a modern Snowflake data warehouse**. The `.stm` file grows with each lesson — by Lesson 7 it covers schemas, fragments, imports, a full mapping with transforms, nested address handling, and business metrics.

---

## Core Lessons

### [Lesson 01 — What is STM & Your First File](01-what-is-stm.md)

The problem with spreadsheet-based mapping documents, and how STM solves it. Covers the three-delimiter philosophy (`( )` metadata, `{ }` structure, `" "` natural language), all four string types, all three comment types, and a minimal working example: one schema, one mapping, one arrow. Ends with the first step of the running example.

**Covers:** design philosophy, delimiters, string types, comment types (`//`, `//!`, `//?`), first `schema` + `mapping` + `->` example.

---

### [Lesson 02 — Schemas: Defining Your Data](02-schemas.md)

How to describe any data structure — database table, JSON payload, flat file, API response — in a single `schema` block. Introduces every metadata token, field-level notes, and nested `record` and `list` structures for deep object hierarchies.

**Covers:** `schema` block syntax, field declarations, type tokens, metadata tokens (`pk`, `required`, `unique`, `indexed`, `pii`, `encrypt`, `enum`, `default`, `format`, `ref`), field `note`, nested `record` and `list` blocks.

---

### [Lesson 03 — Fragments & Imports: Reusable Building Blocks](03-fragments-and-imports.md)

How to avoid repeating field definitions across schemas. Introduces fragment blocks, the `...spread` syntax, and `import` statements for cross-file composition. Shows how to build a `lib/common.stm` library of shared field sets and lookup schemas that any project file can pull in.

**Covers:** `fragment` block, `...fragment_name` spread, `import { } from "..."`, organising a shared library, practical patterns: audit columns, address fields, lookup schemas.

---

### [Lesson 04 — Mappings: Connecting Source to Target](04-mappings.md)

The core of STM: describing how data flows from one schema to another. Covers the anatomy of a `mapping` block, direct arrows, computed/derived arrows that produce output with no direct source, arrow-level metadata, and how to express multi-source joins in natural language.

**Covers:** `mapping` block, `source { }`, `target { }`, `note { }`, direct `src -> tgt` arrows, computed `-> tgt { }` arrows, metadata on mappings and arrows, multi-source joins.

---

### [Lesson 05 — Transforms: Shaping Data in Motion](05-transforms.md)

Everything that can happen between source and target. Covers the `|` pipeline operator, the full mechanical transform vocabulary, natural language transform bodies, mixed transforms that combine both, value maps for discrete and range conversions, and reusable named `transform` blocks.

**Covers:** `|` pipeline, mechanical transforms (full vocabulary table), NL transform bodies `"..."`, mixed transforms, `map { }` value maps with literal keys / range keys (`< N`) / `default`, reusable `transform` blocks and `...spread`.

---

### [Lesson 06 — Nested & Array Mappings](06-nested-and-array-mappings.md)

Real payloads are rarely flat. Covers all path expression forms, relative paths inside nested contexts, nested arrow blocks for mapping object-to-object, array-to-array mapping with `[]`, and multi-level nesting. Completes the running example's address mapping.

**Covers:** dotted paths (`a.b.c`), `[]` array notation, backtick identifiers, relative paths (`.field`), `nested_arrow` blocks, `Source[] -> Target[] { }` pattern, multi-level nesting.

---

### [Lesson 07 — Metrics: Business Measurement](07-metrics.md)

How to capture business metric definitions alongside your mapping specs so everything that produces a number is in one place. Covers metric block syntax, metadata (`source`, `grain`, `slice`, `filter`), field measures, and note blocks for ownership documentation.

**Covers:** `metric` block, metric metadata tokens, `measure additive | non_additive | semi_additive`, `note` blocks in metrics, when metrics are the right tool vs. a computed arrow.

---

### [Lesson 08 — Working with AI Agents](08-ai-agents.md)

How to configure your LLM agent to understand STM automatically and use it to accelerate your mapping work. Covers `AGENTS.md` setup, `AI-AGENT-REFERENCE.md` as a system-prompt include, the Excel-to-STM workflow, validating LLM-generated output, and iterative refinement patterns.

**Covers:** `AGENTS.md` / `CLAUDE.md` configuration, `AI-AGENT-REFERENCE.md`, Excel-to-STM workflow (paste → schema draft → mapping draft → review), what LLMs typically get wrong, refinement prompt patterns.

---

### [Lesson 09 — The STM CLI: Slicing & Dicing Your Workspace](09-stm-cli.md)

A complete guide to the `stm` command-line tool. Covers installation, every command with real examples, and how to pipe `stm context` output into your agent's prompt for surgical, low-noise edits.

**Covers:** `stm summary`, `stm schema`, `stm metric`, `stm mapping`, `stm find`, `stm lineage`, `stm where-used`, `stm warnings`, `stm context`, `--json` and `--compact` flags, integrating CLI output with agent prompts.

---

### [Lesson 10 — Real-World Workflows: Delivery End-to-End](10-real-world-workflows.md)

Brings everything together with a complete project walkthrough: from an Excel spreadsheet all the way to a versioned, reviewed, exported STM workspace. Covers multi-file workspace organisation, namespaces (preview), Git-based review, stakeholder export, data vault and Kimball dimensional patterns, and building a project-level `AGENTS.md` for zero-context-overhead sessions.

**Covers:** multi-file workspace layout, namespace/workspace blocks *(coming soon — preview)*, Git review workflow, Excel-to-STM-to-export end-to-end, data vault / Kimball patterns, shared `lib/`, breaking-change detection, team AGENTS.md.

---

## Playbook Extensions

Persona-specific guides. Each assumes familiarity with the core lessons (or at least Lessons 1–5).

### [Lesson 11 — The Business Analyst's Playbook](11-ba-playbook.md)

For BAs and delivery leads who own mapping specifications and need to collaborate with engineers and agents without getting lost in syntax. Covers escaping Excel, writing NL transforms developers can actually implement, reviewing STM in GitHub, and using an agent as a drafting partner.

**Personas:** Business Analyst, Delivery Lead / Program Manager

---

### [Lesson 12 — The Data & Analytics Engineer's Playbook](12-data-engineer-playbook.md)

For engineers building warehouse and lakehouse pipelines who want to use STM as the mapping source of truth. Covers lakehouse bronze-to-silver patterns, ERP-to-DWH canonical mappings, data vault and Kimball dimensional modelling in STM, and generating dbt model scaffolding from a metric block.

**Personas:** Data Platform Engineer, Analytics Engineer / Data Modeler

---

### [Lesson 13 — The Governance & Audit Playbook](13-governance-playbook.md)

For governance, risk, and audit stakeholders who need to trace sensitive fields, produce evidence for regulators, and maintain a versioned record of mapping decisions. Covers systematic PII tagging, `stm find` for data-asset inventories, lineage reports as audit evidence, `//!` warnings as a governance mechanism, and STM pull-request diffs as a change-control record.

**Personas:** Governance / Risk / Audit Stakeholder, Enterprise Architect

---

### [Lesson 14 — The Integration Engineer's Playbook](14-integration-engineer-playbook.md)

For engineers building message, API, and file-based transformations between systems. Covers EDI and B2B partner onboarding patterns, API modernisation and facade layers, event-stream normalisation, XML with xpath annotations, protobuf with tag annotations, and managing partner variants as separate mapping blocks over a shared schema library.

**Personas:** Integration Engineer, Enterprise Architect

---

## Suggested Reading Paths

| Your role | Start here | Then |
|-----------|-----------|------|
| New to STM entirely | Lessons 1 → 2 → 3 → 4 → 5 | Continue sequentially |
| BA who owns mapping docs | Lessons 1 → 2 → 4 → 5 → 8 | Lesson 11 playbook |
| Data engineer building pipelines | Lessons 1 → 2 → 3 → 4 → 5 → 6 → 7 | Lesson 12 playbook |
| Governance / audit role | Lessons 1 → 2 → 4 → 9 | Lesson 13 playbook |
| Integration engineer | Lessons 1 → 2 → 3 → 4 → 5 → 6 | Lesson 14 playbook |
| Using an AI agent with STM | Lesson 1 → Lesson 8 → Lesson 9 | Then your role playbook |

---

## File List

```
lessons/
├── README.md                          ← this file (lesson plan index)
├── 01-what-is-stm.md
├── 02-schemas.md
├── 03-fragments-and-imports.md
├── 04-mappings.md
├── 05-transforms.md
├── 06-nested-and-array-mappings.md
├── 07-metrics.md
├── 08-ai-agents.md
├── 09-stm-cli.md
├── 10-real-world-workflows.md
├── 11-ba-playbook.md
├── 12-data-engineer-playbook.md
├── 13-governance-playbook.md
└── 14-integration-engineer-playbook.md
```
