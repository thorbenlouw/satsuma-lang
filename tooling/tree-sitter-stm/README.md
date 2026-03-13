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

## Local Prerequisites

Generating the parser requires the local `tree-sitter-cli` package. Running
parser tests also requires a working C toolchain. On macOS that means Command
Line Tools or Xcode must be installed and selected so `tree-sitter test` can
compile the generated parser.

## Version Target

Current target: STM v1.0.0.

## Non-Goals

- semantic lint rules
- formatting output
- import graph resolution
- type checking
- code generation
