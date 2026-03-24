# Changelog

## v0.2.0 — 2026-03-24

### Formatter (`satsuma fmt`)

- **Opinionated, zero-config formatter** — one canonical style for all Satsuma
  files, analogous to `gofmt` or `black`. No settings, no overrides.
- **CLI command:** `satsuma fmt [path]` with `--check` (CI mode, exit 1 if
  unformatted), `--diff` (print unified diff), `--stdin` (pipe mode).
- **VS Code Format Document** — LSP `DocumentFormattingProvider` wired to the
  same shared `format()` function. Supports format-on-save.
- **Parser-backed:** walks the full tree-sitter CST, preserves all comments,
  never changes semantics.
- **Field column alignment** with name/type/metadata columns (caps at 24/14
  characters to prevent pathological widths).
- **Blank line normalisation:** 2 between top-level blocks, 1 within blocks,
  no trailing blanks, single newline at EOF.
- **Comment handling:** all three types preserved (`//`, `//!`, `//?`), section
  headers kept as-is, trailing inline comments with 2-space gap.
- **CI integration:** `satsuma fmt --check examples/` step in the CI pipeline.
- 81 formatter tests, 16/16 corpus files idempotent and structurally equivalent.

### VS Code Extension

- **WASM migration** — LSP server now uses web-tree-sitter (WASM) instead of
  native bindings, eliminating platform-specific build requirements.
- **Arrow navigation** — go-to-definition from arrow paths to source/target
  schema fields.
- **NL-ref navigation** — go-to-definition from backtick references inside
  natural language strings.
- **TODO diagnostics** — `//!` and `//?` comments surfaced in the Problems panel
  with warning/info severity.
- **Underlined NL refs** — backtick references inside NL strings get underline
  styling for visual distinction.
- Fixed WASM runtime packaging in `.vsix` artifacts.

### Site

- **GitHub Pages site** with brand guide, landing page, CLI reference, VS Code
  feature tour, examples gallery, and learning resources.
- Dynamic version templating and release notes links.
- FAQ section and no-CLI getting-started guide.

### Infrastructure

- Versioned releases via manual `workflow_dispatch`.
- Build artifacts auto-attached to tagged releases.
- Shell injection fix in CI workflow inputs.
- Tailwind CSS vendored locally for SRI compliance.

---

## v0.1.0 — 2026-03-24

First tagged release of the Satsuma language and toolchain.

### Language

- **Satsuma v2 specification** — formal grammar covering schemas, mappings,
  fragments, transforms, metrics, namespaces, imports, natural-language blocks,
  value maps, pipe chains, metadata vocabulary, and unified field syntax.
- **16 canonical examples** demonstrating real-world patterns: database migrations,
  CRM-to-warehouse syncs, EDI/COBOL/XML/Protobuf format conversion, multi-source
  joins, metric definitions, namespace-based platform modelling, and governance
  filters.
- **AI agent reference** — a compact (~900 token) grammar summary designed for
  LLM prompts, also available via `satsuma agent-reference`.

### Tree-Sitter Parser

- Full v2 grammar with 490 corpus tests across 25 test files.
- Covers all spec constructs including nested records, list_of fields,
  namespace blocks, multi-line NL strings, and adjacent string concatenation.
- Error recovery tests for malformed input.
- Tree-sitter queries: `highlights.scm`, `folds.scm`, `locals.scm`.

### CLI (`satsuma`)

16 commands for structural extraction, analysis, validation, and diff:

- **Workspace extractors:** `summary`, `schema`, `metric`, `mapping`,
  `find --tag`, `lineage`, `where-used`, `warnings`, `context`
- **Structural primitives:** `arrows`, `nl`, `meta`, `fields`, `match-fields`
- **Graph analysis:** `graph` (with `--json`, `--compact`, `--schema-only`,
  `--namespace` filters)
- **Validation:** `validate`, `lint` (3 rules with `--fix`), `diff`
- **Agent support:** `agent-reference`

All commands produce deterministic, parser-backed output. JSON output via
`--json` on every command. 679 tests across 154 suites, all passing.

### VS Code Extension

Full editor experience backed by a tree-sitter LSP server:

- **Syntax highlighting** — TextMate grammar with semantic token overrides for
  context-sensitive constructs.
- **Diagnostics** — parse errors in real time; semantic warnings on save via
  `satsuma validate`; `//!` and `//?` comment markers surfaced in Problems panel.
- **Navigation** — go-to-definition, find-references, rename symbol (cross-file,
  namespace-aware).
- **IntelliSense** — context-aware completions for schema names, fragment/transform
  spreads, field paths, metadata tokens, and pipeline functions.
- **Document structure** — outline panel, breadcrumbs, code folding for all block
  types, contextual hover.
- **CodeLens** — inline annotations showing field counts, usage counts, and
  source/target relationships.
- **Commands** — 9 palette commands: validate, lineage, where-used, warnings,
  summary, arrows, workspace graph, field lineage, mapping coverage.
- **Workspace graph** — interactive SVG diagram with click-to-navigate and
  namespace filtering.
- **Field lineage** — multi-hop visual trace from source to target through
  transforms.
- **Mapping coverage** — gutter markers and status bar showing mapped vs unmapped
  fields.

142 LSP server tests.

### Documentation

- Language specification (`SATSUMA-V2-SPEC.md`)
- CLI command reference (`SATSUMA-CLI.md`)
- AI agent reference (`AI-AGENT-REFERENCE.md`)
- Business analyst tutorial (`BA-TUTORIAL.md`)
- Use cases and personas (`USE_CASES.md`)
- Data modelling conventions for Kimball and Data Vault patterns
- Security threat model and report (`SECURITY-REPORT.md`)
- Excel-to-Satsuma conversion prompt for web LLMs

### Not Yet Included

- `satsuma fmt` (formatter)
- Type checking
- Code generation (Python, SQL, dbt scaffolding)
- Excel-to-Satsuma and Satsuma-to-Excel conversion tooling
