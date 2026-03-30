# ADR-014 — Language v1 to v2 Specification Migration

**Status:** Accepted
**Date:** 2026-03 (retrospective)

## Context

The original Satsuma language (v1) was designed as an initial exploration of source-to-target mapping syntax. As the tooling matured (tree-sitter parser, CLI, LSP server), several pain points emerged:

- The `map` keyword conflicted with common programming terminology and was ambiguous in documentation
- The grammar had 13+ specialized `_kv_value` forms for metadata values, each with subtly different parsing rules — a maintenance burden and a source of parser conflicts
- Single-quoted names (`'My Schema'`) coexisted with backtick-quoted names (`` `My Schema` ``), creating two ways to do the same thing
- There was no syntax for multi-source arrows (multiple input fields feeding one output)
- Natural-language cross-references used bare backtick syntax, which was ambiguous with quoted names

## Decision

Archive the v1 specification and examples (`archive/v1/`) and create a v2 specification (`SATSUMA-V2-SPEC.md`) with the following changes:

1. **`map` → `mapping`** — renamed the top-level keyword to avoid ambiguity
2. **Greedy `value_text` / `pipe_text`** — replaced 13 specialized `_kv_value` forms and `token_call`/`arithmetic_step` with two greedy rules that consume everything up to the next structural boundary. This eliminated parser conflicts and made the grammar dramatically simpler
3. **Dropped single-quote syntax** — all block labels, imports, and spreads use backtick quoting exclusively
4. **Multi-source arrows** — `map_arrow` accepts comma-separated source paths (`a, b -> c`)
5. **`@ref` syntax** — introduced the `@` sigil for NL cross-references, replacing bare backtick mentions (later formalized in ADR-009)
6. **Unified escape patterns** — standardized escape sequences across all quoted contexts

The v1 specification, examples, and feature specs were moved to `archive/v1/` and `archive/features/` for historical reference. All tooling was updated to target v2 exclusively.

## Consequences

**Positive:**
- The grammar shrank from ~40 value-related rules to 2, eliminating an entire class of parser conflicts
- Single canonical quoting syntax (backticks) removes ambiguity in documentation and tooling
- Multi-source arrows enable natural representation of joins and aggregations
- The `@ref` sigil is visually distinct and unambiguous in all contexts
- Archiving v1 with full history preserves the design rationale for future reference

**Negative:**
- All existing v1 `.stm` files required migration (corpus, examples, tests, documentation)
- No automated migration tool was built — migration was manual (acceptable given the small corpus at the time)
- External consumers of v1 syntax (if any exist) have no upgrade path beyond manual rewriting
