# Roadmap

Open work items and ideas for Satsuma. Concrete items have PRD references; ideas are tracked here until they graduate to a feature spec.

---

## Concrete Deferred Work

### Excel-to-Satsuma Full Skill (Feature 04, Phases 1-5)

The lite system prompt is authored and updated to v2 syntax at `useful-prompts/excel-to-stm-prompt.md`. The full skill — Python CLI tool (`excel_tool.py`), Claude Code skill prompt with survey/translate/critique phases, and end-to-end validation — is designed but not implemented.

**Why deferred:** The full skill is significant implementation effort. The lite prompt is available for immediate use; the full tooling should follow once the approach is validated.

**Source:** `features/04-excel-to-stm-skill/PRD.md` (Phases 1-5)

### Satsuma-to-Excel Export (Feature 05)

Generate Excel workbooks from Satsuma files for non-technical stakeholders. Ships in two tiers: lite system prompt + full CLI tool. Neither tier is started.

**Why deferred:** Lower priority than parser, CLI, and data-modelling foundations. The lite prompt approach should be validated with the Excel-to-Satsuma skill first before investing in the reverse direction.

**Source:** `features/05-stm-to-excel-export/PRD.md`

### VS Code Language Server — Lineage Visualization (Feature 16)

The LSP server is complete (Phases 1-3 delivered: semantic tokens, diagnostics, go-to-definition, find-references, completions, hover, rename, code lens, folding, document symbols). The remaining deferred item is an interactive lineage visualization webview powered by `satsuma graph`.

**Why deferred:** The core LSP features are shipped. Lineage visualization is a standalone enhancement that depends on webview infrastructure.

**Source:** `features/16-vscode-language-server/PRD.md`

### Data Modelling Tooling (Feature 06, Phases 2-3)

The Feature 06 convention spec and examples are complete. Future phases include:
- **Phase 2:** Linting rules that validate metadata token combinations (e.g., `hub` + `dimension` conflict)
- **Phase 3:** DDL/dbt model generation from convention-annotated schemas

**Why deferred:** These are tooling features that build on the convention spec. One validator bug remains (duplicate schema definitions across files cause false field-not-in-schema warnings — tracked as sl-5ms4). Once resolved, this tooling work can proceed.

**Source:** `features/06-data-modelling-with-stm/PRD.md` (Non-Goals section)

---

## Ideas

### External Schema Import (DBML, Protobuf, Avro, JSON Schema ...)

The grammar doesn't need to understand every schema language. We just need a clean way to say "this structure is defined over there, bring it in."

```stm
// Pull in a DBML file -- the tooling resolves it to Satsuma-equivalent fields
schema crm_database (from dbml "schemas/crm.dbml", table "customers") {}

// Same idea for Avro, Protobuf, JSON Schema
schema events (from avro "schemas/clickstream.avsc") {}
schema warehouse (from protobuf "protos/warehouse.proto", message "OrderRow") {}
schema api_payload (from json-schema "schemas/order-response.json") {}

// You can still override or annotate individual fields after import
schema crm_database (from dbml "schemas/crm.dbml", table "customers") {
  email  STRING  (pii)              // add metadata the DBML didn't have
  phone  STRING  (pii, format E.164)
}
```

**Why metadata tokens and not a grammar extension:** The DBML/Avro/etc. parsers live in external tooling. Satsuma just needs to say "resolve this" and then the AST looks identical to a hand-written schema block. An LLM interpreter can read the referenced file and inline the fields.

---

## Convention Docs Still To Write

The following are not language changes — they are convention documentation (like the existing `docs/data-modelling/` and `docs/conventions-for-schema-formats/` guides) that show DEs how to use existing metadata tokens for specific patterns. Detailed PRD: [`features/21-convention-docs/PRD.md`](features/21-convention-docs/PRD.md).

- **Merge / upsert strategy** — conventions for `(merge upsert, match_on ..., on_match ..., on_no_match ...)` metadata on mapping blocks. Covers upsert, append, soft-delete, and full-refresh patterns. Target: `docs/conventions-for-merge-strategy/`.
- **Governance tags** — conventions for `owner`, `steward`, `retention`, `classification`, `mask`, `compliance` and org-extensible tokens. Target: `docs/conventions-for-governance/`.
- **jsonPath for field references** — conventions for `(jsonpath "...")` metadata paralleling existing `(xpath "...")`. Target: `docs/conventions-for-schema-formats/json/`.
- **Reports and ML models** — conventions for using `schema` with `(report)` or `(model)` metadata tokens to declare pipeline consumers with NL descriptions and explicit source dependencies. Target: `docs/conventions-for-reports-and-models/`.

---

## Design Principles

These principles guide all future syntax and convention decisions:

- **Stay declarative and BA-friendly** — describe *what*, not *how*.
- **Lean on existing constructs** — `(metadata)` tokens, bare `"NL strings"` in `{ }`, `note { }` blocks, and vocabulary conventions — before inventing new keywords.
- **Natural language is the escape hatch** — for anything too complex or domain-specific to express in a piped transform chain, write intent in English and let the interpreter figure it out.
- **Vocabulary tokens are the extension mechanism** — new semantics come from *convention* (token dictionaries) and *tooling* (linters, interpreters), not grammar changes.
- **High bar for new keywords** — "Is this concept so fundamentally different from schema/fragment/mapping that using an existing keyword would confuse a BA reading the file?"
