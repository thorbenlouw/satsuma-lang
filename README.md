# STM

STM is a domain-specific language for source-to-target data mapping.

It is designed to replace ad hoc spreadsheets, wiki tables, and overly verbose
structured specs with a format that is:

- readable by humans
- parseable by tools
- compact enough for AI agents to generate and consume reliably
- stable enough to act as the source of truth for downstream tooling

STM is intended to sit between systems and describe how data moves from one
shape to another, whether those systems are databases, APIs, files, messages,
events, or mixed enterprise platforms.

## Why STM Exists

Most mapping specifications today are hard to trust operationally:

- spreadsheets are inconsistent and drift from implementation
- free-form docs are readable but not machine-checkable
- YAML and JSON are parseable but too noisy for large mapping inventories
- vendor tools often hide critical logic behind UI configuration

STM aims to solve that by making mapping intent explicit in a language that both
people and parsers can work with directly.

That matters even more in AI-assisted delivery. Agents can produce better code,
better reviews, and better impact analysis when they operate against a
constrained language instead of reverse-engineering free-form implementation
logic.

## What STM Covers

STM supports:

- schema and record structure declarations
- source-to-target field mappings
- computed target fields
- transform pipelines
- conditional mapping logic
- comments and rich notes with semantic intent
- reusable fragments and imports
- multi-file workspaces for platform-wide lineage

The long-term tooling model is parser-first:

1. grammar and parser
2. AST/CST conventions
3. linter and validator
4. formatter
5. editor support
6. visualizers and generators

## Example

```stm
integration "Customer_Sync" {
  cardinality 1:1
}

source crm "CRM System" {
  id       INT
  email    STRING(255) [pii]
  status   CHAR(1)     [enum: {A, I}]
}

target warehouse "Analytics Model" {
  customer_id   UUID         [pk, required]
  email_address STRING(255)  [format: email]
  is_active     BOOLEAN
}

mapping {
  id     -> customer_id   : uuid_v5("namespace", id)
  email  -> email_address : trim | lowercase | validate_email | null_if_invalid
  status -> is_active     : map { A: true, I: false }
}
```

For richer examples, see [examples/db-to-db.stm](/Users/thorben/dev/personal/stm/examples/db-to-db.stm),
[examples/edi-to-json.stm](/Users/thorben/dev/personal/stm/examples/edi-to-json.stm),
and [examples/multi-source-hub.stm](/Users/thorben/dev/personal/stm/examples/multi-source-hub.stm).

## Repository Guide

- [STM-SPEC.md](/Users/thorben/dev/personal/stm/STM-SPEC.md): authoritative language specification
- [PROJECT-OVERVIEW.md](/Users/thorben/dev/personal/stm/PROJECT-OVERVIEW.md): problem statement, vision, and roadmap
- [IMPLEMENTATION-GUIDE.md](/Users/thorben/dev/personal/stm/IMPLEMENTATION-GUIDE.md): tooling architecture and parser-first implementation strategy
- [AI-AGENT-REFERENCE.md](/Users/thorben/dev/personal/stm/AI-AGENT-REFERENCE.md): compact grammar and quick reference for agents
- [USE_CASES.md](/Users/thorben/dev/personal/stm/USE_CASES.md): practical scenarios and personas
- [examples/](/Users/thorben/dev/personal/stm/examples): canonical STM examples
- [tooling/tree-sitter-stm/](/Users/thorben/dev/personal/stm/tooling/tree-sitter-stm): tree-sitter parser package
- [tooling/vscode-stm/](/Users/thorben/dev/personal/stm/tooling/vscode-stm): VS Code syntax highlighting extension

## Current Status

The repository is centered on specification and parser-first tooling.

What exists today:

- the STM v1.0.0 language spec
- a canonical example corpus
- implementation guidance for downstream tools
- an in-repo `tree-sitter-stm` grammar package for syntax parsing work

What is not complete yet:

- semantic linting and validation
- formatting
- import resolution
- type checking
- code generation
- end-user CLI workflows

## Workspace And Lineage Model

STM supports multi-file platform modeling through workspace files. A workspace
declares the schemas that make up a platform and maps namespace names to source
files. That gives tooling one canonical entry point for platform-wide lineage
and impact analysis.

In practical terms:

- library files define reusable schemas, fragments, and lookups
- integration files define source/target structures and mapping blocks
- workspace files assemble many integrations into one platform scope

This matters when multiple teams have similarly named schemas or when lineage
needs to cross project boundaries cleanly.

## Parser-First Tooling

Downstream tools should be built on the parser, not on text heuristics.

The parser work lives in
[tooling/tree-sitter-stm/](/Users/thorben/dev/personal/stm/tooling/tree-sitter-stm)
and is responsible for syntax parsing only. Semantic validation, formatting,
import resolution, and code generation should consume the parser output rather
than reinterpreting raw STM text.

If you are contributing tooling, start here:

- read [STM-SPEC.md](/Users/thorben/dev/personal/stm/STM-SPEC.md)
- inspect the example corpus in [examples/](/Users/thorben/dev/personal/stm/examples)
- review the parser plan in [features/01-treesitter-parser/PRD.md](/Users/thorben/dev/personal/stm/features/01-treesitter-parser/PRD.md)
- treat CST and AST naming stability as part of the public implementation surface

## Development

### Prerequisites

- Node.js 22+
- Python 3.12+
- C toolchain (Xcode Command Line Tools on macOS, `build-essential` on Linux)

### Tree-sitter parser

```bash
cd tooling/tree-sitter-stm
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

### VS Code extension

```bash
cd tooling/vscode-stm
npm install
npm run check             # validate manifest/grammar + run all tests
```

### CI

GitHub Actions runs both the parser and VS Code extension checks on every push
and pull request to `main`. The workflow also enforces that grammar conflict count
matches `tooling/tree-sitter-stm/CONFLICTS.expected` — update that file when
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
