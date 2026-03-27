# Changelog


## v0.4.0 — 2026-03-27

### Visual Mapping Workspace

- New two-level visualisation in the VS Code extension: an overview mode with
  compact schema cards and thick mapping arrows, plus a focused mapping-detail
  view with source schemas, a central arrow table, and the target schema.
- Mapping-detail hover now cross-highlights rows and fields in both directions,
  making multi-schema joins and transforms much easier to inspect.
- Added pan/zoom reset on overview-to-detail transitions, smoother fade
  animation, a minimap, SVG export, mapping tooltips, and a cleaner toolbar.
- Schema cards now render metadata pills and Markdown notes, and the layout no
  longer fails when mappings reference missing ports.

### VS Code Extension

- Added the new visualisation panel backed by the `@satsuma/viz` web component
  package and LSP-driven visual model extraction.
- Registered `.satsuma` files alongside `.stm`, added file icons, and grouped
  Satsuma commands coherently in the editor context menu.
- Fixed `Find References` for arrow paths and backtick NL references.
- Fixed bundled WASM runtime resolution so the packaged extension works
  reliably outside the development environment.

### CLI And Distribution

- The CLI now ships as one universal release artifact built on WASM
  `web-tree-sitter`, removing platform-specific release packaging.
- Release packaging now builds the visualisation bundle before VSIX creation,
  fixing the missing `@satsuma/viz` asset issue in GitHub Actions.
- Install docs now reflect the single universal CLI package for all platforms.

### Documentation

- Added the Feature 23 Phase 5 visual redesign plan and updated release-facing
  docs to reflect `v0.4.0` and the current manual release flow.

## v0.3.0 — 2026-03-26

### Language Simplification (Feature 22)

- **`@ref` cross-references** — new `@schema`, `@schema.field`, and
  `@ns::schema.field` syntax for referencing entities inside NL strings.
  Replaces the need for backtick-only references; backticks remain supported.
- **Grammar simplification** — collapsed 13 `kv_value` forms into greedy
  `value_text`, replaced `token_call`/`arithmetic_step` with greedy `pipe_text`,
  and simplified `map_key`/`map_value` with `repeat1`. Net reduction of ~150
  grammar rules with zero loss of expressiveness.
- **Backtick-only labels** — single-quoted block labels (`'name'`) removed from
  the grammar. All multi-word labels now use backtick syntax (`` `name` ``).
- **Multi-source arrows** — `a, b -> target` syntax for arrows with multiple
  source fields. Grammar, extraction, canonicalization, and CLI output all
  updated.

### CLI

- **`@ref` extraction** — `nl-refs`, `validate`, `lint`, `graph`, and `lineage`
  commands all recognize `@ref` syntax alongside backtick references.
- **Lineage follows `@ref` edges** — `satsuma lineage` traverses `nl_ref` edges
  emitted by `graph`, providing full cross-reference lineage.
- **`hidden-source-in-nl` auto-fix** — `satsuma lint --fix` can now insert
  missing source declarations when an NL reference mentions an undeclared schema.
  Severity raised from warning to error.
- **Canonical output** — all commands emit namespace-qualified, canonical field
  references (e.g. `ns::schema.field`) for consistent downstream consumption.
- **30 bug fixes** across two bughunt rounds, including:
  - Source block join NL extraction and `@ref` scanning
  - Field-scoped `nl` queries now recurse into `each`/`flatten` blocks
  - `graph --schema-only` no longer duplicates edges for namespaced mappings
  - `validate` no longer false-warns when duplicate mapping names exist across files
  - `classify` correctly detects mixed NL/structural pipe steps
  - `mapping --compact --json` now strips transforms, notes, and metadata
  - `lint` no longer flags backtick emphasis in file-level notes or dotted
    sub-field paths of declared sources
  - 3+ segment `@ref` paths (e.g. `@schema.record.subfield`) correctly resolve
    through nested record structures
  - Consistent `1`-indexed row numbers in all JSON output
  - Formatter preserves blank lines between header and section comments
- **845 CLI tests** (up from 679 in v0.1.0).

### VS Code Extension

- **`@ref` highlighting** — TextMate grammar updated with `@ref` token rules.
- **LSP `@ref` support** — semantic tokens, go-to-definition, and diagnostics
  for `@ref` cross-references.

### Documentation

- All examples, tutorials, convention guides, and spec updated for `@ref`
  syntax and backtick-only labels.
- New EDI convention guide (EDIFACT / ODETTE / TRADACOMS).
- MARC21 convention example gaps closed.
- Satsuma-to-Excel conversion skill added.
- Site examples and stats refreshed for v2 syntax.

### Infrastructure

- `npm run install:all` builds WASM parser and LSP server in one step.
- Integration tests run concurrently (24s down to 7.5s).
- CI test reporting via JUnit XML.

---

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
