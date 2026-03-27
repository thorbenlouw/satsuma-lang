![Satsuma logo](assets/512x_satsuma_logo.png)

# Satsuma

[![CI](https://github.com/thorbenlouw/satsuma-lang/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/thorbenlouw/satsuma-lang/actions/workflows/ci.yml?query=branch%3Amain+event%3Apush)
[![Release](https://github.com/thorbenlouw/satsuma-lang/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/thorbenlouw/satsuma-lang/actions/workflows/release.yml)
[![Security](https://github.com/thorbenlouw/satsuma-lang/actions/workflows/security.yml/badge.svg?branch=main&event=push)](https://github.com/thorbenlouw/satsuma-lang/actions/workflows/security.yml?query=branch%3Amain+event%3Apush)

Satsuma is a domain-specific language for source-to-target data mapping.

It is designed to replace ad hoc spreadsheets, wiki tables, and overly verbose
structured specs with a format that is:

- readable by humans
- parseable by tools
- compact enough for AI agents to generate and consume reliably
- stable enough to act as the source of truth for downstream tooling

Satsuma is intended to sit between systems and describe how data moves from one
shape to another, whether those systems are databases, APIs, files, messages,
events, or mixed enterprise platforms.

What makes Satsuma different is that it does not force a false choice between
formal structure and human intent. The language keeps schemas, mappings,
metadata, and references deterministic and parser-backed, while still allowing
natural language exactly where real projects need it: notes, business rules,
underspecified transforms, and review context.

That makes Satsuma a good fit for AI agents. Deterministic tooling can extract
the structural facts with high confidence, while an LLM handles the reasoning
over the natural-language parts. The parser and CLI are not competing with the
agent; they are the reliable substrate that lets the agent reason safely.

## Why Satsuma Exists

Most mapping specifications today are hard to trust operationally:

- spreadsheets are inconsistent and drift from implementation
- free-form docs are readable but not machine-checkable
- YAML and JSON are parseable but too noisy for large mapping inventories
- vendor tools often hide critical logic behind UI configuration

Satsuma aims to solve that by making mapping intent explicit in a language that both
people and parsers can work with directly.

That matters even more in AI-assisted delivery. Agents can produce better code,
better reviews, and better impact analysis when they operate against a
constrained language instead of reverse-engineering free-form implementation
logic.

The intended operating model is hybrid:

- Satsuma captures the deterministic structure of the integration
- the `satsuma` CLI extracts facts, topology, metadata, lineage, and NL content
- the LLM reasons over those extracted facts plus the embedded natural-language intent

This is the core idea: use deterministic tools for what must be exact, and use
LLM reasoning for what cannot be fully formalized without making the language
unusable.

## Natural Language as a First-Class Part of the Spec

Satsuma treats natural language as part of the specification surface, not as an
embarrassing escape hatch.

In real mapping work, some intent is naturally formal:

- source and target structures
- field references
- metadata tags
- imports and reusable definitions
- deterministic transform pipelines

Some intent is not naturally formal, at least not without turning the mapping
document into a programming language:

- business rules that depend on domain interpretation
- legacy behaviors that are known but not fully codified
- transformation notes that require analyst review
- implementation guidance and caveats for downstream teams

Satsuma keeps both in one versioned artifact. That is important for AI agents:

- the parser-backed parts provide reliable structure
- the natural-language parts preserve the reasoning context humans actually use
- the CLI can surface both without inventing semantics
- the agent can then apply judgment instead of scraping prose from Excel cells

## Extensible Metadata: Satsuma's Superpower

Satsuma's `( )` metadata accepts **any vocabulary token**. There are no reserved
metadata keywords. When you write `(merge upsert, match_on customer_id)` or
`(dimension, scd 2)`, you are not using built-in language features — you are
using conventions that anyone can define and document.

That means your organisation can encode its own standards directly into specs:

```satsuma
schema payments (
    owner "payments-team",
    data_domain "finance",
    cost_center "CC-4200",
    audit_level high,
    compliance {PCI-DSS, SOX}
) {
  ...
}
```

None of those tokens required a language change. They work today. Write an
`LLM-Guidelines.md` that tells AI agents how to interpret your custom tokens
(what DDL to generate, what tests to create, what policies to enforce), and
every AI agent in your organisation knows how to act on them. The
[convention guides](docs/) that ship with Satsuma
([Kimball](docs/data-modelling/kimball/LLM-Guidelines.md),
[Data Vault](docs/data-modelling/datavault/LLM-Guidelines.md),
[Merge Strategy](docs/conventions-for-merge-strategy/LLM-Guidelines.md),
[Governance](docs/conventions-for-governance/LLM-Guidelines.md),
[Reports & Models](docs/conventions-for-reports-and-models/LLM-Guidelines.md))
are ready-made examples of this pattern.

## What Satsuma Covers

Satsuma supports:

- schema and record structure declarations
- source-to-target field mappings
- computed target fields
- transform pipelines
- conditional mapping logic
- comments and rich notes with semantic intent
- reusable fragments and imports
- multi-file platform modeling for platform-wide lineage

The long-term tooling model is parser-first:

1. grammar and parser
2. AST/CST conventions
3. linter and validator
4. formatter
5. editor support
6. visualizers and generators

For agent workflows specifically, the model is:

1. author or generate `.stm`
2. validate and extract with deterministic tooling
3. let the agent reason over the extracted structure plus NL intent
4. generate code, reviews, documentation, or impact analysis from that combined view

## Install the CLI

A universal pre-built package is published on every merge to `main`. It uses
WASM internally, so the same package works on macOS, Linux, and Windows:

```bash
npm install -g https://github.com/thorbenlouw/satsuma-lang/releases/download/latest/satsuma-cli.tgz
```

This gives you the `satsuma` command on your PATH. Run `satsuma --help` to see
available commands.

> **Can't install the CLI or VS Code extension?** Satsuma is still useful
> without any tooling. LLMs can read and generate `.stm` files directly — our
> tests show 3–8x fewer tokens than equivalent spreadsheets or YAML — and
> plain-text files version-control cleanly. See
> **[Using Satsuma Without the CLI](docs/using-satsuma-without-cli.md)** for
> workflows with web LLMs like ChatGPT, Gemini, or Claude.ai.

## Example

```satsuma
note { "Customer sync — legacy CRM to analytics warehouse" }

schema crm (note "Legacy CRM — SQL Server 2008") {
  CUST_ID     INT            (pk)
  CUST_TYPE   CHAR(1)        (enum {R, B, G})  //! NULL means Retail
  FIRST_NM    VARCHAR(100)
  LAST_NM     VARCHAR(100)
  EMAIL_ADDR  VARCHAR(255)   (pii)
  STATUS      CHAR(1)        (enum {A, I})
}

schema warehouse (note "Analytics Model — PostgreSQL 16") {
  customer_id   UUID         (pk, required)
  customer_type VARCHAR(20)  (enum {retail, business, government})
  display_name  VARCHAR(200) (required)
  email_address VARCHAR(255) (format email)
  is_active     BOOLEAN
}

mapping {
  source { `crm` }
  target { `warehouse` }

  CUST_ID    -> customer_id   { uuid_v5("namespace", CUST_ID) }
  EMAIL_ADDR -> email_address { trim | lowercase | validate_email | null_if_invalid }
  STATUS     -> is_active     { map { A: true, I: false } }

  CUST_TYPE -> customer_type {
    map { R: "retail", B: "business", G: "government", null: "retail" }
  }

  -> display_name {
    "If @CUST_TYPE is null or R, trim and concat @FIRST_NM + ' ' + @LAST_NM.
     Otherwise 'UNKNOWN'."
  }
}
```

For richer examples, see [examples/db-to-db.stm](examples/db-to-db.stm),
[examples/edi-to-json.stm](examples/edi-to-json.stm),
and [examples/multi-source-hub.stm](examples/multi-source-hub.stm).

## Learn Satsuma

The **[Lessons](lessons/README.md)** are the fastest way to get productive with
Satsuma and an AI agent. 10 core lessons build the mental model progressively,
and 4 role-specific playbooks adapt it to how you actually work:

| Lessons | What you learn |
|---|---|
| [01 — What Satsuma Is Really For](lessons/01-what-is-satsuma.md) | The hybrid model, three delimiters, setting up your AI agent |
| [02 — Reading Satsuma with an Agent](lessons/02-reading-satsuma.md) | Schemas, metadata, nested structures, asking the agent to explain |
| [03 — Writing Schemas from Imperfect Inputs](lessons/03-writing-schemas.md) | Drafting from DDL, JSON, Excel; preserving ambiguity |
| [04 — Reuse, Imports, and Multi-File Thinking](lessons/04-reuse-and-imports.md) | Fragments, imports, workspace organization |
| [05 — Mapping Blocks](lessons/05-mappings.md) | Arrows, transforms, value maps, multi-source mappings |
| [06 — Natural Language Transforms](lessons/06-nl-transforms.md) | When to formalize vs. keep it natural, `@ref` references |
| [07 — Nested Data, Arrays, and Complex Shapes](lessons/07-nested-mappings.md) | Dotted paths, array notation, nested arrow blocks |
| [08 — The Satsuma CLI](lessons/08-satsuma-cli.md) | 16 commands as the agent's deterministic toolkit |
| [09 — Human-Agent Workflows](lessons/09-agent-workflows.md) | Impact analysis, coverage checks, PII audits, change review |
| [10 — End-to-End Delivery](lessons/10-real-world-workflows.md) | The full delivery loop from gathering to versioned source of truth |

**Playbooks:** [Business Analyst](lessons/11-ba-playbook.md) ·
[Data Engineer](lessons/12-data-engineer-playbook.md) ·
[Governance & Audit](lessons/13-governance-playbook.md) ·
[Integration Engineer](lessons/14-integration-engineer-playbook.md)

Start with Lesson 01 or jump to a [suggested reading path](lessons/README.md#suggested-reading-paths) based on your role.

## Repository Guide

- [SATSUMA-V2-SPEC.md](SATSUMA-V2-SPEC.md): authoritative language specification
- [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md): problem statement, vision, and roadmap
- [SATSUMA-CLI.md](SATSUMA-CLI.md): CLI command reference (21 commands for structural extraction, analysis, and validation)
- [AI-AGENT-REFERENCE.md](AI-AGENT-REFERENCE.md): compact grammar and quick reference for agents (also available via `satsuma agent-reference`)
- [docs/tutorials/](docs/tutorials/): role-based tutorials (BA, data engineer, integration engineer)
- [USE_CASES.md](USE_CASES.md): practical scenarios and personas
- [HOW-DO-I.md](HOW-DO-I.md): question-based index to all guides and conventions
- [ROADMAP.md](ROADMAP.md): deferred work items, ideas, and convention docs still to write
- [examples/](examples): canonical Satsuma examples
- [tooling/tree-sitter-satsuma/](tooling/tree-sitter-satsuma): tree-sitter parser package
- [tooling/satsuma-cli/](tooling/satsuma-cli): CLI tool for structural extraction and validation
- [tooling/vscode-satsuma/](tooling/vscode-satsuma): VS Code extension with LSP server and syntax highlighting
- [skills/excel-to-satsuma/](skills/excel-to-satsuma): Agent Skill for converting Excel mapping spreadsheets to Satsuma ([agentskills.io](https://agentskills.io) standard) — includes Python CLI tool and Claude Code slash command
- [useful-prompts/](useful-prompts): self-contained system prompts for web LLMs ([Excel-to-Satsuma](useful-prompts/excel-to-stm-prompt.md), [Satsuma-to-Excel](useful-prompts/stm-to-excel-prompt.md))

## Current Status

What exists today:

- the Satsuma v2 language specification
- a canonical example corpus (20 `.stm` files covering major integration patterns)
- a tree-sitter parser (245 corpus tests, all examples parse clean)
- a TypeScript CLI (`satsuma`) with 21 commands for structural extraction, analysis, validation, formatting, and diff — see [SATSUMA-CLI.md](SATSUMA-CLI.md)
- `satsuma fmt` — opinionated, zero-config formatter (CLI + VS Code Format Document)
- a VS Code extension with an LSP server (go-to-definition, find-references, completions, hover, rename, code lens, semantic tokens, diagnostics, folding, document symbols, formatting) and TextMate grammar
- `satsuma lint` with 3 rules (hidden NL source refs, unresolved NL refs, duplicate definitions) and `--fix` support
- namespace support for multi-team, multi-domain platform modelling
- data modelling conventions for Kimball and Data Vault patterns with canonical examples
- pre-built CLI release artifacts published on every merge to `main`

What is not complete yet:

- type checking
- code generation

### Excel Conversion Tooling

- **Excel → Satsuma**: A full [Agent Skill](skills/excel-to-satsuma/) with a Python CLI tool (`excel_tool.py`) and a Claude Code slash command (`/excel-to-satsuma`). The skill surveys the spreadsheet, generates idiomatic Satsuma with chunked extraction, and self-critiques the output. A [lite prompt for web LLMs](useful-prompts/excel-to-stm-prompt.md) is also available for zero-setup conversion.
- **Satsuma → Excel**: A [lite prompt for web LLMs](useful-prompts/stm-to-excel-prompt.md) that generates a Python script producing stakeholder-ready Excel workbooks from `.stm` files. A deterministic CLI tool is planned but not yet started.

## Multi-File Lineage

Satsuma supports multi-file platform modeling through imports and namespaces.
That gives tooling a consistent way to traverse lineage and impact across a
platform without introducing a special file type.

In practical terms:

- library files define reusable schemas, fragments, and lookups
- integration files define source/target structures and mapping blocks
- namespace-qualified imports connect those files into one platform graph

This matters when multiple teams have similarly named schemas or when lineage
needs to cross project boundaries cleanly.

## Parser-First Tooling

Downstream tools should be built on the parser, not on text heuristics.

The parser work lives in
[tooling/tree-sitter-satsuma/](tooling/tree-sitter-satsuma)
and is responsible for syntax parsing only. Semantic validation, formatting,
import resolution, and code generation should consume the parser output rather
than reinterpreting raw Satsuma text.

The same principle applies to AI-agent integrations. Agents should prefer
parser-backed CLI output over raw file scraping for structural questions, then
apply reasoning only where the language intentionally carries natural-language
meaning.

If you are contributing tooling, start here:

- read [SATSUMA-V2-SPEC.md](SATSUMA-V2-SPEC.md)
- inspect the example corpus in [examples/](examples)
- review the parser in [tooling/tree-sitter-satsuma/](tooling/tree-sitter-satsuma) and its grammar
- review the CLI in [tooling/satsuma-cli/](tooling/satsuma-cli) and its command reference in [SATSUMA-CLI.md](SATSUMA-CLI.md)
- treat CST and AST naming stability as part of the public implementation surface

## Development

### Prerequisites

- Node.js 22+
- Python 3.12+
- C toolchain (Xcode Command Line Tools on macOS, `build-essential` on Linux)

### Setup

Install all dependencies (root + all sub-packages) in one step:

```bash
npm run install:all
```

To start fresh, clean all `node_modules` directories and reinstall:

```bash
npm run reinstall
```

### Tree-sitter parser

```bash
cd tooling/tree-sitter-satsuma
npm install
npm run generate          # generate parser from grammar.js
npm test                  # corpus tests + fixture tests + consumer tests + smoke tests
```

Individual test suites:

```bash
../../scripts/tree-sitter-local.sh test   # corpus tests only
python3 scripts/test_fixtures.py          # example and recovery fixtures
python3 scripts/test_cst_summary.py       # CST consumer unit tests
python3 scripts/test_smoke_summary.py     # smoke test all examples
```

### Satsuma CLI

```bash
cd tooling/satsuma-cli
npm install
npm test                  # 772 tests covering all 21 commands
npm link                  # makes `satsuma` available globally
```

Quick usage:

```bash
satsuma summary examples/            # structural overview
satsuma validate examples/           # structural + semantic validation
satsuma schema customers examples/   # show a specific schema
satsuma lineage --from legacy_sqlserver examples/   # trace data flow
```

To set up an AI agent, print the built-in reference:

```bash
satsuma agent-reference               # print grammar, conventions, and CLI guide
satsuma agent-reference > .github/copilot-instructions.md   # feed to Copilot
```

See [SATSUMA-CLI.md](SATSUMA-CLI.md) for full command reference.

### VS Code extension
We haven't published the extension to the official VSCode Marketplace yet. 
A pre-built `.vsix` is published on every merge to `main`. Download it from the
[latest release](https://github.com/thorbenlouw/satsuma-lang/releases/tag/latest)
and install:

* In VSCode, open the Command Palette (CMD-SHIFT-P) and choose 'Extensions: Install from VSIX...'
* Navigate to where you downloaded the .vsix file and select it
* You should see the Satsuma extension in the list of extensions now. Commands like 'Satsuma: Show Warnings' are available, and the syntax highlighting for `.stm` files should work. 

To build from source or run the test suite:

```bash
cd tooling/vscode-satsuma
npm install
npm run check             # validate manifest/grammar + run all tests
```

### CI

GitHub Actions runs both the parser and VS Code extension checks on every push
and pull request to `main`. The workflow also enforces that grammar conflict count
matches `tooling/tree-sitter-satsuma/CONFLICTS.expected` — update that file when
adding or removing documented conflicts.

## Contributing

Contributions are most useful when they strengthen the parser-backed ecosystem.

Good contribution areas:

- grammar and parser improvements
- corpus tests and malformed-input recovery tests
- additional canonical examples
- AST/CST mapping documentation
- editor tooling and visualization work

When syntax, semantics, or supported constructs are in question, prefer the
spec over secondary docs and call out mismatches explicitly.

## Concerned About Security?

Satsuma is a local-only, read-only analysis tool — it makes no network calls,
stores no credentials, and runs no user-supplied code. The entire toolchain is
open source and auditable. Automated security scanning (npm audit, Semgrep,
Gitleaks, Dependabot) runs on every pull request, and releases are gated behind
passing security checks.

For a full threat model, dependency audit, and enterprise adoption guidance, see
the **[Security Report](SECURITY-REPORT.md)**.

## Author

Satsuma was created by [Thorben Louw](https://github.com/thorbenlouw) at
[Equal Experts](https://www.equalexperts.com/).

## License

This project is licensed under the [MIT License](LICENSE).

## Citing Satsuma

If you use Satsuma in academic or technical writing, please cite it. See
[CITATION.cff](CITATION.cff) for machine-readable citation metadata.
