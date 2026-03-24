# Future Work

Items below are speculative or aspirational and not ready to implement yet. They are tracked here rather than as active tickets to keep the backlog focused on concrete, ready work.

---

## Excel-to-Satsuma Full Skill (Feature 04, Phases 1-5)

The lite system prompt is authored and updated to v2 syntax at `useful-prompts/excel-to-stm-prompt.md`. The full skill — Python CLI tool (`excel_tool.py`), Claude Code skill prompt with survey/translate/critique phases, and end-to-end validation — is designed but not implemented.

**Why deferred:** The full skill is significant implementation effort. The lite prompt is available for immediate use; the full tooling should follow once the approach is validated.

**Source:** `features/04-excel-to-stm-skill/PRD.md` (Phases 1-5)

---

## Satsuma-to-Excel Export (Feature 05)

Generate Excel workbooks from Satsuma files for non-technical stakeholders. Ships in two tiers: lite system prompt + full CLI tool. Neither tier is started.

**Why deferred:** Lower priority than parser, CLI, and data-modelling foundations. The lite prompt approach should be validated with the Excel-to-Satsuma skill first before investing in the reverse direction.

**Source:** `features/05-stm-to-excel-export/PRD.md`

---

## VS Code Language Server — Lineage Visualization (Feature 16, Phase 3 extension)

The LSP server is complete (Phases 1–3 delivered: semantic tokens, diagnostics, go-to-definition, find-references, completions, hover, rename, code lens, folding, document symbols). The remaining deferred item is an interactive lineage visualization webview powered by `satsuma graph`.

**Why deferred:** The core LSP features are shipped. Lineage visualization is a standalone enhancement that depends on webview infrastructure.

**Source:** `features/16-vscode-language-server/PRD.md`

---

## Data Modelling Tooling (Feature 06, Phases 2-3)

The Feature 06 convention spec and examples are complete. Future phases include:
- **Phase 2:** Linting rules that validate metadata token combinations (e.g., `hub` + `dimension` conflict)
- **Phase 3:** DDL/dbt model generation from convention-annotated schemas

**Why deferred:** These are tooling features that build on the convention spec. Feature 13 parser bugs are resolved; one validator bug remains (duplicate schema definitions across files cause false field-not-in-schema warnings — tracked as sl-5ms4). Once that is resolved, the examples will validate clean across subdirectories and this tooling work can proceed.

**Source:** `features/06-data-modelling-with-stm/PRD.md` (Non-Goals section)
