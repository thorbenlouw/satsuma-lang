# Satsuma

[![CI](https://github.com/thorbenlouw/satsuma-lang/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/thorbenlouw/satsuma-lang/actions/workflows/ci.yml?query=branch%3Amain+event%3Apush)
[![Release](https://github.com/thorbenlouw/satsuma-lang/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/thorbenlouw/satsuma-lang/actions/workflows/release.yml)

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

## Install the CLI

Pre-built binaries are published on every merge to `main`. Install with npm
(no local build required):

```bash
# macOS (Apple Silicon)
npm install -g https://github.com/thorbenlouw/satsuma-lang/releases/download/latest/satsuma-cli-darwin-arm64.tgz

# Linux (x64)
npm install -g https://github.com/thorbenlouw/satsuma-lang/releases/download/latest/satsuma-cli-linux-x64.tgz
```

This gives you the `satsuma` command on your PATH. Run `satsuma --help` to see
available commands.

## Example

```stm
note { "Customer sync — 1:1 mapping from CRM to data warehouse" }

schema crm (note "CRM System") {
  id       INT           (pk)
  email    STRING(255)   (pii)
  status   CHAR(1)       (enum {A, I})
}

schema warehouse (note "Analytics Model") {
  customer_id   UUID         (pk, required)
  email_address STRING(255)  (format email)
  is_active     BOOLEAN
}

mapping {
  source { `crm` }
  target { `warehouse` }

  id     -> customer_id   { uuid_v5("namespace", id) }
  email  -> email_address { trim | lowercase | validate_email | null_if_invalid }
  status -> is_active     { map { A: true, I: false } }
}
```

For richer examples, see [examples/db-to-db.stm](examples/db-to-db.stm),
[examples/edi-to-json.stm](examples/edi-to-json.stm),
and [examples/multi-source-hub.stm](examples/multi-source-hub.stm).

## Repository Guide

- [SATSUMA-V2-SPEC.md](SATSUMA-V2-SPEC.md): authoritative language specification
- [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md): problem statement, vision, and roadmap
- [SATSUMA-CLI.md](SATSUMA-CLI.md): CLI command reference (16 commands for structural extraction, analysis, and validation)
- [AI-AGENT-REFERENCE.md](AI-AGENT-REFERENCE.md): compact grammar and quick reference for agents
- [BA-TUTORIAL.md](BA-TUTORIAL.md): practical tutorial for business analysts
- [USE_CASES.md](USE_CASES.md): practical scenarios and personas
- [FUTURE-WORK.md](FUTURE-WORK.md): deferred and speculative work items
- [examples/](examples): canonical Satsuma examples
- [tooling/tree-sitter-satsuma/](tooling/tree-sitter-satsuma): tree-sitter parser package
- [tooling/satsuma-cli/](tooling/satsuma-cli): CLI tool for structural extraction and validation
- [tooling/vscode-satsuma/](tooling/vscode-satsuma): VS Code syntax highlighting extension

## Current Status

What exists today:

- the Satsuma v2 language specification
- a canonical example corpus (11 `.stm` files covering all major integration patterns)
- a tree-sitter parser (190 corpus tests, all examples parse clean)
- a CLI (`satsuma`) with 16 commands for structural extraction, analysis, validation, and diff — see [SATSUMA-CLI.md](SATSUMA-CLI.md)
- a VS Code extension with TextMate grammar for v2 syntax highlighting
- data modelling conventions for Kimball and Data Vault patterns with canonical examples
- pre-built CLI release artifacts published on every merge to `main`

What is not complete yet:

- semantic linting beyond current `satsuma validate` checks
- formatting (`satsuma fmt`)
- cross-file import resolution in single-file validation
- type checking
- code generation
- Excel-to-Satsuma and Satsuma-to-Excel conversion tooling

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
npm test                  # 224 tests covering all 16 commands
npm link                  # makes `satsuma` available globally
```

Quick usage:

```bash
satsuma summary examples/            # structural overview
satsuma validate examples/           # structural + semantic validation
satsuma schema customers examples/   # show a specific schema
satsuma lineage --from legacy_sqlserver examples/   # trace data flow
```

See [SATSUMA-CLI.md](SATSUMA-CLI.md) for full command reference.

### VS Code extension

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

## Author

Satsuma was created by [Thorben Louw](https://github.com/thorbenlouw) at
[Equal Experts](https://www.equalexperts.com/).

## License

This project is licensed under the [MIT License](LICENSE).

## Citing Satsuma

If you use Satsuma in academic or technical writing, please cite it. See
[CITATION.cff](CITATION.cff) for machine-readable citation metadata.
