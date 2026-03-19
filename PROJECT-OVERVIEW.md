# STM: Source-To-Target Mapping Language

## Project Overview & Vision

---

## The Problem

Data integration is one of the most common activities in enterprise software engineering. Every migration, every system integration, every ETL pipeline starts with the same question: *"How does data in system A map to data in system B?"*

The answer to that question today lives in **source-to-target mapping documents** — and they are almost universally terrible.

### What mapping documents look like today

**Excel spreadsheets.** The overwhelming majority of mapping specs are created in Excel. They are:

- **Inconsistent.** Every team, every project, every consultant invents their own column layout. Source Field, Target Field, Transformation, Comments, Data Type, Required... but the columns change every time, the naming varies, and the structure is ad-hoc.
- **Ambiguous.** Transformation logic is described in free-text cells: *"Convert to uppercase and validate"* — but what does "validate" mean? What happens on failure? These questions get answered in Slack threads and lost.
- **Unversioned.** Excel files get emailed, copied to SharePoint, edited by multiple people. Which version is current? Nobody knows for certain.
- **Unparseable.** No tool can reliably consume an arbitrary mapping spreadsheet. Every new project requires a human to read the Excel, interpret the intent, and manually translate it to code.
- **Disconnected from implementation.** The mapping doc says one thing; the code does another. Drift is inevitable because there's no mechanical link between the spec and the implementation.

**Wiki pages and Confluence docs.** Slightly better for narrative context, but even worse for structure. Tables in Confluence are painful to maintain and impossible to parse programmatically.

**YAML/JSON specs (our previous attempt).** More structured, but verbose. A simple field mapping that a human would express as `CUST_TYPE → customer_type (R=retail, B=business)` becomes 5-7 lines of YAML. The signal-to-noise ratio is poor, and the format is hostile to both quick scanning and large-scale specs.

### Why this matters now

The rise of AI coding agents changes the equation. We are entering an era where:

1. **AI agents will generate integration code** — but they need a structured, unambiguous spec to work from. An Excel spreadsheet with free-text transformation descriptions is not that.
2. **AI agents will help *write* mapping specs** — by reading source system documentation, interviewing stakeholders, and proposing mappings. But they need a format they can produce reliably.
3. **AI agents will validate implementations** — comparing generated code against the mapping spec to detect drift. This requires a parseable spec, not prose.
4. **Integration complexity is increasing** — microservices, event-driven architectures, multi-cloud, and real-time streaming create orders of magnitude more integration points than traditional batch ETL.

The world needs a **lingua franca** for data mapping that is simultaneously human-readable and machine-parseable.

---

## The Vision

**STM is to data mapping what DBML is to database schemas** — a concise, beautiful, parseable domain-specific language that becomes the single source of truth for how data transforms between systems.

### Design goals

1. **A business analyst should be able to read it.** If a BA can't scan a mapping spec and understand what's happening, the format has failed. Readability is not a nice-to-have; it's the primary design constraint.

2. **An AI agent should be able to write it.** The syntax borrows heavily from languages LLMs already know well (SQL, TypeScript, HCL, DBML). The grammar is compact enough to fit in a system prompt. An agent given a source schema and a target schema should be able to produce valid STM on the first attempt.

3. **A parser should be able to validate it.** Unlike free-text Excel cells, every structural element of STM is formally specified. A linter can catch missing mappings, type mismatches, broken references, and schema inconsistencies automatically.

4. **It should be 40-60% smaller than equivalent YAML.** Token efficiency matters for AI consumption, but it also matters for human scanning. Less ceremony means faster comprehension.

5. **It should handle the real world.** Not just clean REST-to-REST API mappings, but legacy SQL Server databases with dates stored as VARCHAR, EDI fixed-length messages with qualifier-filtered segments, COBOL copybooks with field names that contain spaces, and XML with deeply nested namespaces.

### What STM enables

| Capability | How STM enables it |
|---|---|
| **AI-generated integration code** | Agent reads `.stm` file → generates Python/Java/SQL implementation |
| **AI-assisted spec writing** | Agent reads system docs → proposes `.stm` mapping → human reviews |
| **Automated validation** | Parser checks completeness, type safety, referential integrity |
| **Living documentation** | `.stm` files live in Git alongside code, versioned and reviewed |
| **Cross-team communication** | BAs, data engineers, and architects share one format |
| **Tool ecosystem** | Visualizers, diff tools, code generators, IDE plugins |
| **Migration from Excel** | AI agent reads existing Excel mapping → outputs `.stm` file |

---

## How STM Works

### The three-part structure

Every STM file has three kinds of blocks:

```
┌─────────────────────────────────────────────┐
│  1. SCHEMA BLOCKS                           │
│     Describe the structure of each system   │
│     (fields, types, nesting, annotations)   │
├─────────────────────────────────────────────┤
│  2. MAPPING BLOCKS                          │
│     Describe how data flows between schemas │
│     (field mappings, transforms, logic)     │
├─────────────────────────────────────────────┤
│  3. METADATA                                │
│     Integration context, notes, imports     │
│     (author, cardinality, documentation)    │
└─────────────────────────────────────────────┘
```

This separation of **structure** from **logic** from **context** is fundamental. It means:

- Schema blocks can be imported and reused across integrations
- Mapping blocks can be reviewed independently of schema definitions
- Notes and context travel with the spec, not in separate documents

### A taste of the syntax

```stm
schema legacy_db (note "Legacy CUSTOMER table") {
  CUST_ID       INT          (pk)
  CUST_TYPE     CHAR(1)      (enum {R, B, G})       //! NULL means Retail
  FIRST_NM      VARCHAR(100)
  LAST_NM       VARCHAR(100)
  EMAIL_ADDR    VARCHAR(255)  (pii)
}

schema new_db (note "Modernized customer schema") {
  customer_id   UUID          (pk, required)
  customer_type VARCHAR(20)   (enum {retail, business, government})
  display_name  VARCHAR(200)  (required)
  email         VARCHAR(255)  (format email, pii)
}

mapping {
  source { `legacy_db` }
  target { `new_db` }

  CUST_ID -> customer_id { uuid_v5(NS, CUST_ID) }

  CUST_TYPE -> customer_type {
    map { R: "retail", B: "business", G: "government", null: "retail" }
  }

  -> display_name {
    "If CUST_TYPE is 'R' or null, trim and concat FIRST_NM + ' ' + LAST_NM.
     Otherwise 'UNKNOWN'."
  }

  EMAIL_ADDR -> email { trim | lowercase | validate_email | null_if_invalid }
}
```

Compare this to the equivalent YAML (~35 lines) or Excel (a table with 6 columns and ambiguous free-text transforms). The STM version is scannable, parseable, and complete.

---

## Competitive Landscape & Inspiration

| Existing approach | Strengths | STM advantage |
|---|---|---|
| **Excel spreadsheets** | Familiar, flexible | Parseable, versionable, validated, AI-readable |
| **YAML-based specs** (our v3) | Structured, machine-readable | 40-60% fewer tokens, far more readable |
| **DBML** | Beautiful syntax, great tooling | STM extends the paradigm to transformations, not just schema |
| **dbt** | SQL-native, tested, versioned | STM covers non-SQL sources (EDI, XML, events) and documents the *mapping intent* not just the implementation |
| **Informatica / Talend mappings** | Visual, enterprise-grade | STM is open, text-based, Git-friendly, vendor-neutral |
| **AsyncAPI / OpenAPI** | Standardized API descriptions | STM describes *transformations between* systems, not individual system interfaces |

STM is not trying to replace any of these. It fills a specific gap: **a standardized, parseable, human-readable format for the mapping document that sits between systems.**

---

## Target Audience

### Primary users

- **Data Engineers** writing and maintaining integration pipelines
- **Integration Architects** designing system-to-system data flows
- **Business Analysts** reviewing and signing off mapping specifications
- **AI Agents** generating, consuming, and validating mapping specs

### Secondary users

- **QA Engineers** using mapping specs as test case sources
- **Data Governance teams** tracking PII/sensitivity across system boundaries
- **Project Managers** tracking mapping completeness and open questions

---

## Success Metrics

How we'll know STM is working:

1. **Adoption:** Teams choose STM over Excel for new mapping documents
2. **AI reliability:** Claude/GPT can produce valid STM >90% of the time from a system prompt
3. **Tooling ecosystem:** At least parser, linter, and visualizer exist
4. **Community:** Others contribute examples, tools, or extensions
5. **Reduced rework:** Integration defects attributable to mapping ambiguity decrease

---

## Project Roadmap

### Phase 1: Specification & Reference — DONE
- Formal language specification ([STM-V2-SPEC.md](STM-V2-SPEC.md))
- Canonical example library covering all major integration patterns (11 files)
- AI-optimized cheat sheet and grammar for system prompts ([AI-AGENT-REFERENCE.md](AI-AGENT-REFERENCE.md))
- BA tutorial ([BA-TUTORIAL.md](BA-TUTORIAL.md))
- Data modelling conventions for Kimball and Data Vault patterns with canonical examples

### Phase 2: Core Tooling — DONE
- Tree-sitter parser (190 corpus tests, all examples parse clean)
- CLI (`stm`) with 16 commands for workspace extraction, structural analysis, validation, and diff — see [STM-CLI.md](STM-CLI.md)
- VS Code extension with TextMate grammar for v2 syntax highlighting
- Pre-built CLI release artifacts published on every merge to `main`

### Phase 3: AI Integration — IN PROGRESS
- System prompt for Excel-to-STM conversion (lite variant authored, untested)
- STM-to-Excel export (not started — see [FUTURE-WORK.md](FUTURE-WORK.md))
- STM-to-code generation (Python, Java, SQL, dbt) — not started
- Validation agent (compare implementation against spec) — not started

### Phase 4: Ecosystem — NOT STARTED
- Web-based visualizer (render STM as interactive diagrams)
- Structural diff tool — `stm diff` command exists for structural comparison
- Registry (share and discover reusable schemas/fragments)
- CI/CD integration — CI runs parser, CLI, and extension tests on every PR

---

## Getting Involved

STM is an open specification. Contributions are welcome in the form of:

- Language design feedback
- Example mapping documents in STM format
- Parser and tooling implementations
- IDE plugin development
- Documentation and tutorials
