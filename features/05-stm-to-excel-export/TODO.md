# Satsuma-to-Excel Export — TODO

> **Status: NOT STARTED** — All phases deferred. See `ROADMAP.md`.

## Phase 1: Lite System Prompt
- [ ] Author `satsuma-to-excel-prompt.md` — condense workbook layout, styling, column definitions, transform translation rules, and row grouping into a self-contained prompt (~2,900 tokens)
- [ ] Ensure prompt covers Satsuma v2 syntax: `( )` metadata, `{ }` transforms, `"..."` NL strings, unified `schema` keyword, `-> target` computed fields, `map { }` conditionals
- [ ] Test lite prompt against canonical examples (`sfdc_to_snowflake.stm`, `db-to-db.stm`, `multi-source-join.stm`) on ChatGPT / Gemini / Claude.ai
- [ ] Verify generated Python scripts run and produce correctly formatted `.xlsx` files
- [ ] Iterate on prompt wording based on output quality (styling fidelity, transform translation, tab structure)

## Phase 2: Data Model + Heuristic Parser
- [ ] Implement `model.py` — dataclasses for Integration, Schema, Field, Mapping, MappingEntry, Transform, Lookup, Comment, StmDocument
- [ ] Implement `parser.py` — heuristic text-based parser for Satsuma v2 files
- [ ] Handle integration blocks (name, metadata key-value pairs, tags, note blocks)
- [ ] Handle `schema` blocks with fields, types, `( )` metadata tokens (pk, required, pii, enum, default, etc.)
- [ ] Handle `record` and `list` nested structures within schemas
- [ ] Handle mapping blocks with `->` arrows, `{ }` transform blocks, `map { }` conditionals, nested array mappings
- [ ] Handle computed fields (`-> target` with no source on the left side)
- [ ] Handle natural-language strings (`"..."` and `"""..."""`) in transforms and notes
- [ ] Handle fragment definitions and `...spread` expansion
- [ ] Handle named `transform` blocks and `...spread` in pipelines
- [ ] Handle import resolution (relative paths, recursive, circular detection)
- [ ] Handle all comment types (`//`, `//!`, `//?`) and `(note "...")` metadata
- [ ] Test against all files in `examples/`

## Phase 3: Transform Translation
- [ ] Implement `transforms.py` — deterministic Satsuma-to-human-readable translation rules
- [ ] Translate pipe chains (`|` → `→`)
- [ ] Translate common pipeline tokens (trim, lowercase, validate_email, first, last, etc.) to plain English
- [ ] Translate parameterised functions (coalesce, round, truncate, pad_left, prepend, split, parse, etc.)
- [ ] Translate arithmetic operators (`* N`, `/ N`, `+ N`, `- N`)
- [ ] Translate `map { ... }` blocks to `key = "value"` notation (including conditional maps with `<`, `default`)
- [ ] Pass through natural-language strings (`"..."`) verbatim (strip quotes only)
- [ ] Handle mixed NL + mechanical pipelines (`"description" | round(2)` → `description → round to 2 decimal places`)
- [ ] Resolve named transform spreads (`...clean email` → expand inline)
- [ ] Handle unknown pipeline tokens gracefully (pass through as raw Satsuma)
- [ ] Unit test against comprehensive set of transform expressions

## Phase 4: Workbook Generator
- [ ] Implement `styles.py` — colour palette, fonts, formatting constants
- [ ] Implement `generator.py` — openpyxl workbook generation
- [ ] Overview tab: integration metadata, schemas table (with role: source/target), table of contents (hyperlinked), snapshot warning
- [ ] Issues tab: consolidated `//!` warnings and `//?` questions with colour coding
- [ ] Mapping tabs: field-level mappings with source, target, arrow column, transform, tags, notes
- [ ] Mapping tabs: computed field (`-> target` with no source) styling (italic gray source, light gray row)
- [ ] Mapping tabs: row grouping for conditional `map { }` blocks (parent summary + collapsible child rows)
- [ ] Mapping tabs: row grouping for nested array mappings
- [ ] Mapping tabs: mapping-level `note { }` as merged row above data
- [ ] Mapping tabs: multi-source join description rendered as context row
- [ ] Schema tabs (Src/Tgt): full field listings with PK highlight, PII indicator, notes colour coding
- [ ] Schema tabs: `record`/`list` nested structures shown with indentation and grouping
- [ ] Schema tabs: fragment expansion with grouping and "From fragment:" notes
- [ ] Lookup tabs: Excel Table objects with light styling
- [ ] Apply freeze panes, auto-filter, alternating row fill, print layout to all data tabs
- [ ] Tab ordering: Overview → Issues → Mappings → Targets → Sources → Lookups

## Phase 5: Target Scoping + CLI
- [ ] Implement `scoper.py` — dependency resolution from selected targets
- [ ] Resolve required mappings (via `target { }` references), sources (via `source { }` references), lookups, and fragments
- [ ] Implement `__main__.py` — CLI entry point with argument parsing
- [ ] Support `--targets`, `--title`, `--no-issues`, `--no-schemas`, `--collapse-groups`, `--timestamp`
- [ ] Wire up full pipeline: parse → scope → generate
- [ ] Test scoped exports (single target, multiple targets, all targets)

## Phase 6: Tree-sitter Parser Integration
- [ ] Add tree-sitter-based parsing as preferred strategy in `parser.py`
- [ ] Consume tree-sitter CST and walk to extract all Satsuma v2 constructs
- [ ] Fall back to heuristic parser if tree-sitter unavailable, with warning in Overview tab
- [ ] Test parity between tree-sitter and heuristic parser outputs

## Phase 7: Claude Code Skill
- [ ] Create `.claude/commands/satsuma-to-excel.md` — thin wrapper around CLI
- [ ] Validate input file exists
- [ ] Run CLI tool and summarise output (tab count, mapping count, issue count)
- [ ] Offer to adjust (scope to targets, toggle options)

## Phase 8: End-to-End Validation
- [ ] Test both variants against all canonical examples
- [ ] Compare Lite vs Full output quality
- [ ] Document edge cases and known limitations
- [ ] Create sample output workbooks for `examples/` directory
