# STM-to-Excel Export — TODO

## Phase 1: Lite System Prompt
- [ ] Author `stm-to-excel-prompt.md` — condense workbook layout, styling, column definitions, transform translation rules, and row grouping into a self-contained prompt (~2,900 tokens)
- [ ] Test lite prompt against canonical examples (`sfdc_to_snowflake.stm`, `common.stm`) on ChatGPT / Gemini / Claude.ai
- [ ] Verify generated Python scripts run and produce correctly formatted `.xlsx` files
- [ ] Iterate on prompt wording based on output quality (styling fidelity, transform translation, tab structure)

## Phase 2: Data Model + Heuristic Parser
- [ ] Implement `model.py` — dataclasses for Integration, Schema, Field, Mapping, MappingEntry, Transform, Lookup, Comment, StmDocument
- [ ] Implement `parser.py` — heuristic text-based parser for STM files
- [ ] Handle integration blocks (name, cardinality, author, version, tags, note)
- [ ] Handle schema blocks (source, target, table, message, event, lookup) with fields, types, tags, groups, spreads
- [ ] Handle mapping blocks with `->`, `=>`, transforms, when/else, nested array mappings
- [ ] Handle fragment definitions and `...spread` expansion
- [ ] Handle import resolution (relative paths, recursive, circular detection)
- [ ] Handle all comment types (`//`, `//!`, `//?`) and `note '''...'''` blocks
- [ ] Test against all files in `examples/`

## Phase 3: Transform Translation
- [ ] Implement `transforms.py` — deterministic STM-to-human-readable translation rules
- [ ] Translate pipe chains (`|` → `→`)
- [ ] Translate common functions (trim, lowercase, validate_email, etc.) to plain English
- [ ] Translate parameterised functions (coalesce, round, truncate, pad_left, prepend, etc.)
- [ ] Translate arithmetic operators (`* N`, `/ N`, `+ N`, `- N`)
- [ ] Translate `map { ... }` blocks to `key = "value"` notation
- [ ] Translate `nl("...")` — unwrap to plain text
- [ ] Translate `fallback` to plain English
- [ ] Handle unknown transforms gracefully (pass through as raw STM)
- [ ] Unit test against comprehensive set of transform expressions

## Phase 4: Workbook Generator
- [ ] Implement `styles.py` — colour palette, fonts, formatting constants
- [ ] Implement `generator.py` — openpyxl workbook generation
- [ ] Overview tab: integration metadata, systems table, table of contents (hyperlinked), snapshot warning
- [ ] Issues tab: consolidated `//!` warnings and `//?` questions with colour coding
- [ ] Mapping tabs: field-level mappings with source, target, arrow column, transform, tags, notes
- [ ] Mapping tabs: computed field (`=>`) styling (italic gray source, light gray row)
- [ ] Mapping tabs: row grouping for `when/else` chains (parent summary + collapsible child rows)
- [ ] Mapping tabs: row grouping for nested array mappings
- [ ] Mapping tabs: mapping-level `note` as merged row above data
- [ ] Schema tabs (Src/Tgt): full field listings with PK highlight, PII indicator, notes colour coding
- [ ] Schema tabs: fragment expansion with grouping and "From fragment:" notes
- [ ] Lookup tabs: Excel Table objects with light styling
- [ ] Apply freeze panes, auto-filter, alternating row fill, print layout to all data tabs
- [ ] Tab ordering: Overview → Issues → Mappings → Targets → Sources → Lookups

## Phase 5: Target Scoping + CLI
- [ ] Implement `scoper.py` — dependency resolution from selected targets
- [ ] Resolve required mappings, sources, lookups, and fragments for selected targets
- [ ] Implement `__main__.py` — CLI entry point with argument parsing
- [ ] Support `--targets`, `--title`, `--no-issues`, `--no-schemas`, `--collapse-groups`, `--timestamp`
- [ ] Wire up full pipeline: parse → scope → generate
- [ ] Test scoped exports (single target, multiple targets, all targets)

## Phase 6: Tree-sitter Parser Integration
- [ ] Add tree-sitter-based parsing as preferred strategy in `parser.py`
- [ ] Consume tree-sitter CST and walk to extract all STM constructs
- [ ] Fall back to heuristic parser if tree-sitter unavailable, with warning in Overview tab
- [ ] Test parity between tree-sitter and heuristic parser outputs

## Phase 7: Claude Code Skill
- [ ] Create `.claude/commands/stm-to-excel.md` — thin wrapper around CLI
- [ ] Validate input file exists
- [ ] Run CLI tool and summarise output (tab count, mapping count, issue count)
- [ ] Offer to adjust (scope to targets, toggle options)

## Phase 8: End-to-End Validation
- [ ] Test both variants against all canonical examples
- [ ] Compare Lite vs Full output quality
- [ ] Document edge cases and known limitations
- [ ] Create sample output workbooks for `examples/` directory
