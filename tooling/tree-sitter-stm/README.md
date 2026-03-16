# tree-sitter-stm

Tree-sitter grammar package for STM.

## Scope

This package is responsible for syntax parsing only. It should produce a stable
concrete syntax tree (CST) for STM v1.0.0 and support downstream tooling such
as:

- `stm lint`
- `stm fmt`
- visualizers
- editor integrations
- AST/IR builders

This package does not implement semantic validation, import resolution, type
checking, or code generation.

## Source Of Truth

- Language spec: [`STM-SPEC.md`](/Users/thorben/dev/personal/stm/STM-SPEC.md)
- Canonical examples: [`examples/`](/Users/thorben/dev/personal/stm/examples)
- Parser planning: [`features/01-treesitter-parser/PRD.md`](/Users/thorben/dev/personal/stm/features/01-treesitter-parser/PRD.md)
- Parser task list: [`features/01-treesitter-parser/TODO.md`](/Users/thorben/dev/personal/stm/features/01-treesitter-parser/TODO.md)
- CST/AST mapping: [`docs/ast-mapping.md`](/Users/thorben/dev/personal/stm/docs/ast-mapping.md)

## Package Status

The workspace is intentionally scaffolded before grammar rules land. Initial
implementation priorities are:

1. Lock CST node inventory and ambiguity boundaries.
2. Bootstrap lexical tokens and top-level declarations.
3. Add schema and map body parsing with corpus tests.
4. Add queries, fixtures, and CI checks.

## Planned Layout

- `grammar.js`: Tree-sitter grammar definition
- `queries/`: highlight and fold queries
- `test/corpus/`: feature-oriented grammar corpus
- `scripts/`: parser smoke tests and utility scripts if needed

## Consumer Smoke Test

`scripts/cst_summary.py` is the parser-consumer proof for this package. It runs
the repo-local Tree-sitter wrapper for each STM example file and emits JSON
summaries derived from CST node types, fields, and byte ranges rather than
reparsing STM syntax from raw text.

It currently proves extraction of:

- top-level blocks and schema descriptions
- schema fields and groups
- map entries and path nodes
- comment severities
- note blocks and annotations

Run it from this package directory:

```bash
python3 scripts/cst_summary.py --pretty
```

Or through npm:

```bash
npm run smoke:summary
```

The parser-only unit test for the summary extractor itself does not require
native compilation:

```bash
python3 scripts/test_cst_summary.py
```

## Local Prerequisites

Generating the parser requires the local `tree-sitter-cli` package. Running
parser tests also requires a working C toolchain. On macOS that means Command
Line Tools or Xcode must be installed and selected so `tree-sitter test` can
compile the generated parser.

Use the repo-local wrapper at [`scripts/tree-sitter-local.sh`](/Users/thorben/dev/personal/stm/scripts/tree-sitter-local.sh) for direct CLI work. It keeps Tree-sitter cache and config inside the repository so sandboxed agent runs do not depend on `~/.cache/tree-sitter` or global config:

```bash
../../scripts/tree-sitter-local.sh parse -p . ../../examples/common.stm --quiet
../../scripts/tree-sitter-local.sh test
```

## Version Target

Current target: STM v1.0.0.

## Non-Goals

- semantic lint rules
- formatting output
- import graph resolution
- type checking
- code generation
