# Discovered Requirements

Latent requirements and non-obvious behaviors discovered through exploratory testing, bug fixes, and feature work across 300+ tickets. These are behaviors that the spec and CLI docs don't explicitly call out but that users and tooling authors need to know about.

Each entry links to the ticket(s) where the behavior was discovered.

---

## Table of Contents

1. [Output Indexing](#1-output-indexing-all-line-numbers-must-be-1-indexed)
2. [Exit Code Contract](#2-exit-code-contract)
3. [Backtick-Quoted Identifiers](#3-backtick-quoted-identifiers-must-be-preserved-through-output)
4. [Quoted Metadata Values](#4-quoted-metadata-values-must-round-trip-through-output)
5. [Flatten/Each as Containers](#5-flatteneach-blocks-are-structural-containers-not-arrows)
6. [Path Continuation Dots](#6-path-continuation-dots-must-not-cross-newlines)
7. [Schema-Qualified Path Prefixing](#7-schema-qualified-paths-must-not-be-double-prefixed)
8. [Anonymous Mapping Keys](#8-anonymous-mappings-use-anonfilerow-keys)
9. [NL Refs Are Not Sources](#9-nl-backtick-references-are-not-structural-sources)
10. [Lint --fix Quoting](#10-lint---fix-must-match-existing-quoting-style)
11. [Recursive Field Rendering](#11-nested-fields-must-be-recursively-rendered)
12. [Metric Block Context](#12-metric-blocks-are-first-class-citizens)
13. [Container vs. Leaf Arrows](#13-container-arrows-vs-leaf-arrows)
14. [nl-derived Classification](#14-the-nl-derived-arrow-classification-exists)
15. [Standalone Note/Transform NL](#15-standalone-note-and-transform-blocks-need-nl-extraction)
16. [Comments in Output](#16-comments-in-schema-bodies-are-part-of-the-output)
17. [Formatter Conventions](#17-formatter-conventions)
18. [find --in Validation](#18-find---in-must-validate-scope-values)
19. [Multi-Source Validation](#19-validate-must-check-all-declared-sources-in-multi-source-mappings)
20. [Convention Fields](#20-convention-fields-are-inferred-not-declared)
21. [Import References](#21-import-statements-are-references)
22. [Double-Dot Paths](#22-graph-double-dot-path-bug-pattern)
23. [Compact/No-NL Stripping](#23---compact-and---no-nl-must-strip-all-nl-content)
24. [Column Offsets](#24-column-offsets-must-account-for-quote-characters)
25. [Warnings Block Context](#25-warnings-json-must-include-block-context)
26. [Diff Attribution](#26-diff-command-must-attribute-changes-to-parent-blocks)
27. [Version Sync](#27-version-must-be-synchronized-across-all-package-files)
28. [Fragment Spread Expansion](#28-fragment-spreads-must-be-expanded-across-all-commands)
29. [Namespace Resolution](#29-namespace-resolution-current-namespace-first-then-global)
30. [Deeply Nested NL Paths](#30-deeply-nested-dotted-paths-in-nl-references)
31. [Metadata Value Forms](#31-metadata-supports-rich-value-forms)
32. [Trailing Comment Preservation](#32-trailing-comments-must-not-be-dropped)
33. [Multi-Line Metadata](#33-multi-line-metadata-blocks-must-preserve-structure)
34. [JSON Output Consistency](#34-json-output-consistency-contract)
35. [Error Output Channel](#35-errors-and-warnings-must-use-stderr-not-stdout)
36. [Import Resolution](#36-single-file-entry-points-must-resolve-imports-transitively)
37. [Backtick Stripping in Index](#37-backtick-stripping-in-workspace-index)
38. [NL String Escape Handling](#38-nl-string-escape-sequences-must-be-unescaped)
39. [Lineage Completeness](#39-upstream-lineage-must-follow-all-branches)
40. [Field Count Ambiguity](#40-field-count-meaning-depends-on-fragment-spreads)
41. [Note Block Completeness](#41-note-blocks-must-be-extracted-from-all-parent-types)
42. [Diff Completeness](#42-diff-must-detect-all-change-kinds)
43. [Formatter Field Alignment](#43-formatter-field-alignment-rules)
44. [Source Block NL Content](#44-source-block-join-descriptions-are-nl-content)
45. [Arrow-Adjacent Comments](#45-arrow-adjacent-comments-are-field-scoped-nl)
46. [Numeric Enum Values](#46-numeric-and-quoted-enum-values-are-valid)
47. [Multi-Target Mappings](#47-multi-target-mapping-extraction)
48. [Schema Label Quoting](#48-multi-word-schema-labels-must-be-quoted-in-output)

---

## 1. Output Indexing: All Line Numbers Must Be 1-Indexed

**Tickets:** cbh-7rvo, cbh-gz2v, cbh-s9w6, sl-m02g, sl-2usp, sl-n96y, sl-z3eg, cbh-fmtb

Tree-sitter internally uses 0-indexed row numbers. Every CLI command that emits a row/line number in JSON or text output must add `+1` to produce 1-indexed output. This applies to: `context`, `warnings`, `where-used`, `summary`, `mapping`, `metric`, `find`, `nl`, `graph`, `nl-refs`, `schema`, and `arrows`.

Commands that mix 0-indexed and 1-indexed output in the same workspace are a source of silent downstream errors (e.g., an agent computing a diff between `graph` and `arrows` output gets off-by-one mismatches).

---

## 2. Exit Code Contract

**Tickets:** sl-0ycs, sl-ht9n

The CLI uses a three-tier exit code contract:

| Code | Meaning |
|------|---------|
| 0 | Results found and printed |
| 1 | No results (query matched nothing, or entity exists with zero references) |
| 2 | Structural error (parse failure, filesystem ENOENT/EACCES, invalid arguments) |

Every query command must return exit code 1 when the query matches nothing — including when the named entity exists but has zero references. This is critical for scripting (`satsuma warnings examples/ || echo "clean"`).

Commands affected: `warnings`, `context`, `arrows`, `where-used`, `nl-refs`, `graph`, `lineage`, `fields`.

Mutually exclusive flags (e.g., `--from` and `--to` on `lineage`) must error immediately, not silently ignore one.

---

## 3. Backtick-Quoted Identifiers Must Be Preserved Through Output

**Tickets:** cbh-sttt

Field names wrapped in backticks (e.g., `` `Lead_Source_Detail__c` ``) must retain their backticks in both text and JSON output. The CLI must never strip backticks — they indicate that the identifier contains special characters and stripping them changes the semantics. This applies to all commands that emit field paths: `mapping`, `arrows`, `fields`, `find`, `graph`.

---

## 4. Quoted Metadata Values Must Round-Trip Through Output

**Tickets:** cbh-djny

When a metadata value is quoted in source (e.g., `filter "active"`), the quotes must appear in text output. The CLI tracks a `quoted` flag on metadata entries and re-wraps values in double quotes when rendering. Without this, consumers cannot distinguish `filter active` (a bare token) from `filter "active"` (a string value).

---

## 5. Flatten/Each Blocks Are Structural Containers, Not Arrows

**Tickets:** cbh-zdk3, sc-1ar0

`flatten` and `each` blocks are structural containers whose child arrows are the actual mapping arrows. The `arrowCount` on a mapping must count only the leaf arrows inside these blocks, not the container blocks themselves. Double-counting inflates arrow counts and misleads coverage analysis.

However, flatten/each blocks themselves must appear in mapping text and JSON output (with their child arrows nested inside), even though they don't count as arrows.

---

## 6. Path Continuation Dots Must Not Cross Newlines

**Tickets:** sl-9uh0, sl-3alz

In the tree-sitter grammar, the `.` that continues a dotted field path (e.g., `record.field`) must use `token.immediate(".")` so that it immediately follows the preceding segment with no intervening whitespace or newlines. Without this, the parser merges text across line boundaries in nested blocks, causing "target contamination" — a bare arrow's target text gets concatenated with the next arrow's source.

This was the root cause of the entire "nested block extraction gaps" epic — it caused the last arrow in any nested block to absorb the next line.

---

## 7. Schema-Qualified Paths Must Not Be Double-Prefixed

**Tickets:** sc-7zt0

When emitting JSON for arrows that already contain a schema-qualified path (e.g., `target_schema.field`), the CLI must not blindly prepend the schema name again. A `qualifyPath` helper must check whether the path already starts with the schema name before prefixing.

---

## 8. Anonymous Mappings Use `<anon>@file:row` Keys

**Tickets:** sl-0o1x

Mappings without a name are indexed as `<anon>@filepath:row`. All commands that look up mappings — especially NL-based lint rules — must use this key format, not an empty string. Using an empty string causes silent skips where anonymous mappings are never validated.

---

## 9. NL Backtick References Are Not Structural Sources

**Tickets:** sl-n11t, cbh-h0or
**Resolved by:** Feature 22 Phase 5 (lsp-ah6m, lsp-d4yk, lsp-4hai)

~~When a mapping's NL text references a schema via backtick, that reference must **not** be promoted to a structural source edge in the graph or lineage.~~

**Updated policy (Feature 22):** NL backtick references to schemas now produce `nl_ref` edges in `schema_edges` and are traversed by `lineage`. This is safe because `hidden-source-in-nl` is now an error (not a warning), ensuring all NL-referenced schemas are explicitly declared. The `nl_ref` role distinguishes these from declared `source`/`target` edges. The original phantom lineage bug (cbh-y5og) was caused by treating NL refs as `source` edges — the new approach uses a distinct edge role.

---

## 10. Lint --fix Must Match Existing Quoting Style

**Tickets:** sl-z157

When `lint --fix` inserts a new source entry (e.g., adding a hidden source detected from NL), it must match the quoting convention of existing entries. If existing source entries use backtick wrapping, the inserted entry must also be backtick-wrapped.

---

## 11. Nested Fields Must Be Recursively Rendered

**Tickets:** sl-1ugo, sl-4mh2, sl-giss, sl-bfue

Commands that render field trees (`fields`, `meta`, `find`) must recurse into record and list children. Flat rendering that only shows top-level fields hides nested structure. Similarly:

- `--unmapped-by` must check individual leaf fields inside partially-mapped records, not treat the whole record as a single unit
- `meta` must walk into record/list blocks (not just `field_decl` nodes)
- Nested field paths like `schema.record.field` must be supported for disambiguation when the same field name appears in multiple nested blocks

---

## 12. Metric Blocks Are First-Class Citizens

**Tickets:** sl-h0n8, sl-09bo, sl-se2f, sl-g4u2, cbh-ocid, cbh-kyv3, stm-axj8

Metrics are first-class blocks with fields, source references, slices, namespaces, note blocks, and measure annotations. Many commands initially treated metrics as second-class:

- Lint rules operating on metric note blocks must include the metric's own fields and declared sources as valid resolution context (otherwise: false-positive unresolved-reference warnings)
- Metric JSON must include: namespace, slices, filter values, measure annotations (`additive`/`non_additive`/`semi_additive`), and all metadata
- `meta` must include metric body note blocks (not just header metadata)
- `--compact` on metrics must strip notes but preserve measure metadata
- When metrics use namespace-qualified source refs (e.g., `source vault::hub_deal`), metadata extraction must not duplicate the key as the value

---

## 13. Container Arrows vs. Leaf Arrows

**Tickets:** sl-zfi0, sl-wjb9

An arrow with a `{ }` body containing child arrows (a "container arrow") is structurally different from an arrow with a transform body. Container arrows:
- Have `hasTransform: false` (the braces contain children, not a transform)
- Must include their child arrows in output (not silently drop them)
- Must not be classified as `"none"` — they are structural groupings

Child arrows inside nested blocks must also include their parent path prefix (e.g., `.field -> .target` inside `Items[] -> items[]` becomes `Items[].field -> items[].target`).

---

## 14. The `nl-derived` Arrow Classification Exists

**Tickets:** sl-2x93

The `arrows` command can return a fifth classification value: `nl-derived`, for implicit arrows inferred from NL backtick references. This is in addition to the four documented values (`structural`, `nl`, `mixed`, `none`). Any consumer switching on classification values must handle this case.

Transform classification is purely mechanical CST analysis — it does not interpret semantics. The categories are:
- `structural`: deterministic pipe chain, no NL
- `nl`: NL-only transform body
- `mixed`: pipe chain + NL annotation
- `none`: bare arrow with no transform body
- `nl-derived`: implicit arrow inferred from NL backtick reference (undocumented until sl-2x93)

---

## 15. Standalone Note and Transform Blocks Need NL Extraction

**Tickets:** sl-3dd2, sl-xrc8

`nl-refs` and lint must walk standalone `note { }` and `transform { }` blocks, not just schema/mapping/metric bodies. Standalone notes get a pseudo-mapping key of `"note:"` — resolving backtick refs in them requires special handling since they have no parent schema context.

---

## 16. Comments in Schema Bodies Are Part of the Output

**Tickets:** sl-i956

Schema text output must include `//`, `//!`, and `//?` comments from the schema body. These carry important context (warnings about known issues, TODOs). The `--compact` flag strips them; default output preserves them.

Edge-case: comments before the first field or after the last field in a schema body were initially dropped — only inter-field comments were preserved. All positions must be handled.

---

## 17. Formatter Conventions

**Tickets:** cbh-vgka, cbh-0lhj, cbh-394k, cbh-qwyg

The formatter enforces these spacing conventions that aren't in the spec:

- **One blank line** between top-level blocks (not two)
- **One blank line** preserved between file header comments and section comments
- Files with parse errors are **skipped** (not partially formatted)
- **Trailing comments** after the last arrow in a mapping block must be preserved (not silently dropped)
- **Multi-line field metadata** must preserve its multi-line layout (not be collapsed to single-line)
- Fragment spread lines (`...name`) are standalone at block indent, not column-aligned with fields
- Inline trailing comments must have a minimum 2-space gap from code
- ~80-character threshold for breaking source/target blocks and metadata blocks across lines

---

## 18. find --in Must Validate Scope Values

**Tickets:** sl-1f9d

When `find --in <scope>` receives an unrecognized scope value, it must emit an error — not silently return zero results. Silent empty results are indistinguishable from "no matches" and mislead users into thinking their query matched nothing.

---

## 19. Validate Must Check All Declared Sources in Multi-Source Mappings

**Tickets:** sl-mb6k, sc-8g9a, stm-fi63

When a mapping declares multiple sources, `validate` must check schema-prefixed arrow paths against **all** declared sources, not just the first. It must also handle flatten arrow targets that are schema-qualified without producing false-positive `field-not-in-schema` warnings.

The validator was found to use `mapping.sources[0]` for resolution instead of matching the schema qualifier in the arrow path to the correct source declaration.

---

## 20. Convention Fields Are Inferred, Not Declared

**Tickets:** stm-1hsk, stm-pxl6

Data Vault and other convention metadata tokens (e.g., `datavault hub`) imply the existence of convention fields (`hub_customer_hk`, `record_source`, `load_date`). The validator must suppress `field-not-in-schema` warnings for these inferred fields. A `getConventionFields()` helper derives expected fields from schema metadata tokens.

Similarly, `hub`/`satellite`/`link` vocabulary tokens imply hash keys, record sources, and load dates that are never declared in the schema body.

---

## 21. Import Statements Are References

**Tickets:** sl-izap, stm-6gh9

`import { name } from "file.stm"` declarations must be detected as references by `where-used`. Import references are a distinct reference type alongside arrow sources, arrow targets, NL backtick references, and metric source declarations.

Note: the parser initially lacked grammar support for import declarations entirely — they are spec-backed and used heavily in examples but were a late addition to the grammar.

---

## 22. graph Double-Dot Path Bug Pattern

**Tickets:** sl-bl5e

When constructing dotted field paths for nested record/list fields in graph output, the intermediate segment name must be included. Skipping it produces malformed paths like `schema..field` (double dot) instead of `schema.record.field`. This is a recurring pattern whenever path construction skips the container field name.

---

## 23. --compact and --no-nl Must Strip All NL Content

**Tickets:** sl-vfbv, sl-d8h5

`schema --compact` must strip triple-quoted notes as well as single-line notes. `graph --no-nl` must strip the `unresolved_nl` section in addition to `nl_text` on edges. Partial stripping defeats the purpose of these flags (reducing token count for LLM consumption).

---

## 24. Column Offsets Must Account for Quote Characters

**Tickets:** sl-5erh

When computing column offsets for backtick references inside NL strings, the offset must account for the opening quote character. Off-by-one column values break IDE go-to-definition and highlight features.

---

## 25. Warnings JSON Must Include Block Context

**Tickets:** sl-c7yn

`warnings --json` must include `block` (name) and `blockType` (schema/mapping/metric) fields so consumers know which block a warning belongs to. Warnings without block context require the consumer to re-parse the file to determine provenance.

---

## 26. Diff Command Must Attribute Changes to Parent Blocks

**Tickets:** sl-kf76

When a note block inside a metric or mapping changes, the diff output must attribute the change to that parent block — not report it as an orphaned top-level note addition/removal. Misattribution makes it impossible to assess the impact of a change.

---

## 27. Version Must Be Synchronized Across All Package Files

**Tickets:** cbh-1uu9

A single `VERSION` file is the source of truth. All `package.json` files, the changelog, and any version-reporting code must derive from it. Use `scripts/bump-version.sh` to update atomically. Version drift between packages causes confusing `--version` output.

---

## 28. Fragment Spreads Must Be Expanded Across All Commands

**Tickets:** cbh-5tvk, sl-42ev, sg-u8sh, stm-qjwm

Fragment spreads (`...fragment_name`) are one of the most pervasive sources of inconsistency across the CLI. When a schema uses a fragment spread, every command that operates on fields must expand it:

- **fields**: must include spread fields in the field tree
- **arrows**: must resolve arrow references against expanded fields
- **graph**: must include spread fields in schema nodes
- **validate**: must not flag spread fields as "not in schema"
- **find**: must match spread fields (but must report them at the consuming schema's location, not the fragment definition's location)
- **meta**: must look into spread fields for metadata queries
- **nl-refs**: must resolve backtick refs against expanded fields
- **where-used**: must detect spreads as references to the fragment

Additional complexities:
- **Transitive spreads**: fragments can spread other fragments
- **Namespace-qualified spreads**: `...ns::fragmentName` must resolve across namespaces
- **Nested record spreads**: `PID.Address record { ...address_fields }` must expand at the nested record scope, not at schema level

---

## 29. Namespace Resolution: Current-Namespace-First, Then Global

**Tickets:** stm-prfz, stm-ku9i, stm-sbgx

Namespaces use `::` as separator (e.g., `crm::orders.field`), deliberately chosen to not collide with `.field.nested` syntax. The resolution rule is:

1. Unqualified references inside a namespace block resolve to current namespace first, then global
2. Once a qualified identity is resolved, it must stay qualified throughout that operation
3. Commands must not search CST by bare label only after resolving a qualified key — this aliases different blocks together

This resolution rule was found to be broken across multiple commands (`schema`, `mapping`, `metric`, `nl`, `find`, `lineage`, `graph`), all of which searched by bare label and corrupted qualified lookups.

The `lineage --from` command was also found to emit unqualified target schema names, breaking multi-hop traversal in namespace-aware graphs. Target schemas must always include the namespace prefix.

---

## 30. Deeply Nested Dotted Paths in NL References

**Tickets:** (recent commits on fix/cli-bug-batch-3)

Backtick references in NL strings can use deeply nested dotted paths like `` `CdtTrfTxInf.PmtId.UETR` `` or `` `PID.DateOfBirth` ``. These must resolve to nested record fields, not just schema.field pairs. The `nl-refs` and `arrows` commands must support arbitrary depth in path resolution.

Additionally, NL content must never be silently truncated — if a triple-quoted string contains 500 characters of text, all 500 characters must appear in output.

---

## 31. Metadata Supports Rich Value Forms

**Tickets:** stm-ixb4, stm-zy83

Metadata in `( )` blocks supports a much richer set of forms than basic key-value pairs:

| Form | Example |
|------|---------|
| Bare token | `pk` |
| Numeric | `precision 0` |
| Boolean | `nullable false` |
| Quoted string | `format "E.164"` |
| Dotted reference | `ref addresses.id` |
| Decimal | `tolerance 0.02` |
| Namespace-qualified | `ref ord::orders.id` |
| Filter expression | `filter QUAL == "ON"` |
| Compound ref...on | `ref dim_customer on customer_id` |
| Enum | `enum {A, B, C}` |

Each form needs explicit parsing in the grammar — generic expression parsing is insufficient.

---

## 32. Trailing Comments Must Not Be Dropped

**Tickets:** cbh-394k

The formatter and mapping output must preserve comments after the last arrow in a mapping block. These are typically `//!` warnings or `//?` questions — dropping them is data loss. Comments in any position (before first field, between fields, after last field, after last arrow) must be preserved.

---

## 33. Multi-Line Metadata Blocks Must Preserve Structure

**Tickets:** cbh-qwyg

Multi-line metadata blocks (metadata that spans multiple lines inside parentheses for readability) must not be collapsed to single lines by the formatter or output renderers. The multi-line layout is intentional when the metadata contains many tokens or long note strings.

---

## 34. JSON Output Consistency Contract

**Tickets:** cbh-myj2, sl-io70, sl-rbvk

All JSON output must follow these consistency rules:

- **Filter flags apply to JSON**: `--compact`, `--fields-only`, `--matched-only`, `--unmatched-only` must affect JSON output, not just text
- **Error responses as JSON**: when `--json` is active and an error occurs, the error must be emitted as a JSON object on stdout (not as plain text on stderr)
- **Consistent envelope**: `validate --json` and `lint --json` must use the same envelope structure (both were found using different formats — bare array vs. structured object)
- **Complete field data**: `schema --json` must include all field metadata (pk, required, enum, ref, default, note, xpath, encrypt, format, filter) — not just name and type
- **Arrow details**: arrow metadata, transform content, and field metadata must all appear in JSON output
- **Namespace preservation**: JSON schema output must include namespace field for namespace-qualified schemas

---

## 35. Errors and Warnings Must Use stderr, Not stdout

**Tickets:** (discovered during import resolution work)

Import-resolution warnings, parse-error diagnostics, and other non-data messages must go to stderr, not stdout. Writing them to stdout pollutes `--json` output and breaks pipe chains.

---

## 36. Single-File Entry Points Must Resolve Imports Transitively

**Tickets:** stm-8k6p, stm-gde5

When a single `.stm` file is passed to the CLI (not a directory), the CLI must transitively follow `import` declarations to discover all dependencies. Without this, cross-file validation fails — fields declared in a source schema are flagged as missing because the CLI doesn't know about the other file.

`workspace.js` `resolveInput()` handles this, but it's a non-obvious requirement that single-file invocations need transitive resolution.

---

## 37. Backtick Stripping in Workspace Index

**Tickets:** stm-mks5

When building the workspace index, `extractMappings` must strip backtick delimiters from source/target names before indexing. Storing `` `target_name` `` with backticks breaks every downstream command (`lineage`, `where-used`, `validate`) because backtick-quoted names don't match the indexed names of schemas.

This is the inverse of requirement #3 — backticks must be preserved in *output* but stripped in the *index*.

---

## 38. NL String Escape Sequences Must Be Unescaped

**Tickets:** (discovered during NL extraction work)

NL strings containing escape sequences (`\"`, `\\`) must be unescaped during extraction. Raw escapes in extracted NL text confuse downstream consumers and break backtick-reference resolution (a `` `ref` `` preceded by `\"` won't parse correctly if the escape isn't resolved first).

---

## 39. Upstream Lineage Must Follow All Branches

**Tickets:** sg-pufq

`lineage --to` must walk all upstream predecessor branches, not just a single arbitrary chain. A mapping with multiple sources must surface all of them. Missing branches means incomplete lineage, which defeats the purpose of impact analysis.

`--depth` truncation should use `[?]` markers to indicate truncated paths, not silently drop them.

---

## 40. Field Count Meaning Depends on Fragment Spreads

**Tickets:** cbh-5tvk

There is no single "correct" field count for schemas with fragment spreads. Different commands use different counting strategies:

- `summary`: recursive/leaf counting (includes all nested + spread fields)
- `schema --json`: top-level-only counting
- `find`: reports spread fields at the fragment definition's file/line, not the consuming schema's location

This ambiguity should be documented explicitly. Consumers comparing field counts across commands will get different numbers.

---

## 41. Note Blocks Must Be Extracted from All Parent Types

**Tickets:** cbh-e01s, cbh-ukcx, cbh-kyv3, cbh-7ji8, cbh-so1o

Note blocks (`note { }`) can appear inside:
- Schemas (extracted by most commands)
- Mappings (initially missed by `mapping --json`)
- Metrics (initially missed by `meta`)
- Standalone at file level (needs pseudo-key for NL resolution)
- Inside record/list blocks (should use record/list name as parent, not schema)

All five positions must be handled by every command that surfaces NL or note content.

---

## 42. Diff Must Detect All Change Kinds

**Tickets:** sl-kf76, and the diff epic tickets

The diff command must detect granular changes at every level:

- **Field-level metadata changes**: required, pii, format, etc. changing on a field (not just field add/remove)
- **Arrow-level changes**: individual arrow additions/removals/transform modifications (not just count deltas)
- **Transform body changes**: NL text changing inside a transform
- **Note block changes**: inside mappings, metrics, schemas, and standalone
- **Metric header changes**: source, grain, slice, filter attribute modifications
- **Block-level content**: fragments, transforms, and standalone notes must all be comparable
- **Parent attribution**: all changes must be attributed to their parent block (schema, mapping, metric)

---

## 43. Formatter Field Alignment Rules

**Tickets:** (discovered during formatter implementation)

The formatter uses two-pass column alignment for fields inside blocks:

1. Field names: column-aligned with a 24-character cap
2. Field types: column-aligned with a 14-character cap
3. Metadata: follows type with a minimum 2-space gap

Fragment spreads (`...name`) are not aligned — they sit standalone at block indent level.

---

## 44. Source Block Join Descriptions Are NL Content

**Tickets:** cbh-so1o

NL strings inside source blocks that describe join conditions (e.g., `source { \`orders\`, \`customers\` "joined on customer_id" }`) are NL content that must be extracted by `satsuma nl`. These were initially missed because `nl` only walked mapping bodies, not source declarations.

---

## 45. Arrow-Adjacent Comments Are Field-Scoped NL

**Tickets:** cbh-9cqh

When querying NL content scoped to a specific field (`satsuma nl field schema.field`), warning comments (`//!`) and question comments (`//?`) adjacent to arrows involving that field must be included. These comments are semantically about the field even though they're syntactically siblings.

---

## 46. Numeric and Quoted Enum Values Are Valid

**Tickets:** sl-qc7y

Enum declarations can contain:
- Bare identifiers: `enum {A, B, C}`
- Numeric values: `enum {1, 2, 5, 6}`
- Quoted strings: `enum {"Value Prop", "Follow Up"}`
- Comparison operators: `enum {<, <=, >=, >}`

The grammar must handle all four forms. Numeric enum values initially caused parse failures.

---

## 47. Multi-Target Mapping Extraction

**Tickets:** (discovered during extraction work)

Mappings can declare multiple targets: `target { \`t1\`, \`t2\` }`. Extraction must capture both targets — initially only the first was recognized. Target names with backticks must have the backticks stripped during extraction (same index-vs-output rule as #3/#37).

---

## 48. Multi-Word Schema Labels Must Be Quoted in Output

**Tickets:** (discovered during output rendering)

When rendering schema or mapping labels that contain spaces or special characters in text output, they must be wrapped in single quotes (matching the source syntax). `schema 'order-headers-parquet'` must display as `'order-headers-parquet'`, not as bare text that breaks downstream parsing.

---

## Design Principles Discovered (Not in Spec)

### The CLI Is Structural Primitives, Not High-Level Commands

**Tickets:** stm-u65b, stm-u32p

The CLI provides only deterministic structural extraction — no NL interpretation, no impact analysis, no coverage scoring. These are composed by the agent calling the CLI. The design explicitly separates:

- `validate` (parser/semantic correctness) from `lint` (policy/convention enforcement)
- Structural extraction (CLI) from NL interpretation (agent)
- Deterministic output (always correct) from heuristic output (may need judgment)

### Lint vs. Validate Contract

**Tickets:** stm-mt1d

- `validate`: parser/semantic correctness checks. Exit 0 = valid, exit 1 = invalid.
- `lint`: policy and convention enforcement with optional `--fix`. Exit non-zero when findings exist (even warnings). Autofix must be idempotent and deterministic, never speculative about semantics. Rules must be explicitly named and individually testable.

### NL References Are Structural Extracts, Not Semantic Links

**Tickets:** sl-n11t, cbh-h0or
**Updated by:** Feature 22 Phase 5

Backtick references in NL are syntactic/structural extracts, not validated semantic links. The CLI extracts them mechanically. The agent decides what they mean. ~~Promoting them to structural declarations breaks the graph and lineage.~~ Since Feature 22, NL backtick refs produce `nl_ref` edges (distinct from `source`/`target` edges) in graph and lineage. This is safe because `hidden-source-in-nl` is now an error, guaranteeing all NL-referenced schemas are declared.
