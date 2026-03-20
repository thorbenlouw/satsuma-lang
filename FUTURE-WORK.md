# Future Work

Items below are speculative or aspirational and not ready to implement yet. They are tracked here rather than as active tickets to keep the backlog focused on concrete, ready work.

---

## Excel-to-Satsuma Full Skill (Feature 04, Phases 1-5)

The lite system prompt (`features/04-excel-to-stm-skill/excel-to-stm-prompt.md`) is authored but untested. The full skill — Python CLI tool (`excel_tool.py`), Claude Code skill prompt with survey/translate/critique phases, and end-to-end validation — is designed but not implemented.

**Why deferred:** The full skill depends on real-world testing of the lite prompt first to validate the approach. The Python tool and multi-phase skill prompt are significant implementation effort that should wait until the lite variant is proven against sample spreadsheets.

**Prerequisite:** Test the lite prompt against 2-3 sample spreadsheets on web LLMs and iterate on quality.

**Source:** `features/04-excel-to-stm-skill/PRD.md` (Phases 1-5)

---

## Satsuma-to-Excel Export (Feature 05)

Generate Excel workbooks from Satsuma files for non-technical stakeholders. Ships in two tiers: lite system prompt + full CLI tool. Neither tier is started.

**Why deferred:** Lower priority than parser, CLI, and data-modelling foundations. The lite prompt approach should be validated with the Excel-to-Satsuma skill first before investing in the reverse direction.

**Source:** `features/05-stm-to-excel-export/PRD.md`

---

## NL Lineage — Explicit `nl()` Dependencies (Feature 14)

Proposed language change requiring every `nl()` transform to declare source field dependencies as explicit parameters. This is a spec-level change that affects the grammar, parser, linter, formatter, and all example files.

**Why deferred:** This is a language design proposal with open questions (migration period, zero-dependency `nl()`, duplicate handling). It should go through spec review before implementation work begins. The current `nl()` syntax works for existing use cases; this enhancement improves lineage completeness but is not blocking.

**Source:** `features/14-nl-lineage/PRD.md`

---

## Data Modelling Tooling (Feature 06, Phases 2-3)

The Feature 06 convention spec and examples are complete. Future phases include:
- **Phase 2:** Linting rules that validate metadata token combinations (e.g., `hub` + `dimension` conflict)
- **Phase 3:** DDL/dbt model generation from convention-annotated schemas

**Why deferred:** These are tooling features that build on the convention spec. The convention spec itself needs real-world validation first, and the parser/CLI bugs against the examples (Feature 13) need to be fixed before downstream tooling makes sense.

**Source:** `features/06-data-modelling-with-stm/PRD.md` (Non-Goals section)
