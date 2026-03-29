# ADR-001 — Tree-sitter as the Parsing Foundation

**Status:** Accepted
**Date:** 2026-03 (retrospective)

## Context

Satsuma is a domain-specific language whose files are consumed by both developer tooling (a CLI for structural extraction) and an IDE extension (VS Code). Both consumers need to parse `.stm` files into a structured representation that supports:

- Precise source locations (for go-to-definition, error reporting, coverage decorations)
- Incremental re-parsing (for responsive IDE editing)
- Error recovery (continued extraction even with syntax errors mid-file)
- Structural queries (find all schema blocks, find all arrows)

The alternatives considered were:
- Hand-rolled recursive descent parser
- A PEG/packrat parser generator (e.g., Nearley, Ohm)
- tree-sitter

## Decision

Use tree-sitter as the parsing foundation for all Satsuma tooling.

The grammar lives in `tooling/tree-sitter-satsuma/grammar.js`. All consumers (CLI, LSP server) load the compiled parser at runtime and traverse the resulting Concrete Syntax Tree (CST).

## Consequences

**Positive:**
- Incremental parsing is built in — the LSP server gets sub-millisecond re-parses on keystroke
- Error recovery is built in — the parser produces a tree with `ERROR` nodes rather than throwing; extraction functions can skip or flag broken subtrees
- The grammar is the single source of truth for what valid Satsuma looks like
- The corpus test suite (`tooling/tree-sitter-satsuma/test/corpus/`) serves as both parser tests and grammar documentation
- tree-sitter has integrations for many editors beyond VS Code

**Negative:**
- Grammar changes require regenerating parser artifacts (`tree-sitter generate`)
- The tree-sitter JavaScript API is not typed — satsuma-core maintains its own `SyntaxNode`/`Tree` interface declarations (`types.ts`)
- Contributors without a C toolchain could not build the native binding (resolved by ADR-002)
