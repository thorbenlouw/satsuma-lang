# Feature 08 — Tree-sitter Parser for Satsuma v2

> **Status: COMPLETED** (2026-03-18). All acceptance criteria verified — see `ACCEPTANCE-CHECKLIST.md`.

## Goal

Replace the existing `tooling/tree-sitter-satsuma/` parser (written against v1 syntax) with a new grammar that covers Satsuma v2. The new parser should produce a concrete syntax tree (CST) that exposes every structurally meaningful element tooling needs to extract — with particular emphasis on the queries that will power the LLM context CLI (Feature 09) and a future language server.

---

## Problem

The v1 parser was built before the language settled into its current form. Satsuma v2 changed the structure substantially:

- The `integration` block is gone
- `table`, `message`, `event`, `source`, `target` at schema level are gone — there is only `schema`
- Metadata moved uniformly into `( )` — no tag arrays, no separate annotation syntax
- `record` and `list` replace ad-hoc group/array declarations
- Block labels use single-quoted strings for names with special characters
- The three-delimiter rule (`( )` metadata, `{ }` structure, `" "` NL) is now a hard design constraint, not a convention
- `transform` blocks, `map { }` value maps, `import` syntax, and `//!` / `//?` comment types are all new or changed

Running the v1 parser against current `.stm` files produces errors or silently misparses the majority of constructs. All downstream tooling (highlighting, CLI queries, future linter) is blocked until the grammar is replaced.

---

## Success Criteria

The feature is complete when:

1. The grammar parses all `.stm` files under `examples/` without errors.
2. The CST exposes sufficient structure for every query listed in the **Extraction Targets** section below.
3. A `queries/highlights.scm` exists that provides correct syntax highlighting for all top-level constructs.
4. The grammar has a corpus test covering every syntactic construct in the v2 spec.
5. A smoke-test script prints a JSON summary (schemas, fields, mappings, arrows) for any given `.stm` file.

---

## Non-Goals

- Semantic validation (reference resolution, type checking, constraint enforcement) — that is the linter's job, not the parser's.
- Import resolution across files — the parser sees one file at a time; multi-file graph assembly is a CLI concern.
- Code generation from Satsuma.
- Converting or migrating v1 files — the old grammar lives in git history.

---

## Satsuma v2 Grammar Surface

The parser must cover the following constructs, in full structural detail.

### Top-level

```
source_file ::= top_level_item*

top_level_item ::=
    import_decl
  | note_block
  | schema_block
  | fragment_block
  | transform_block
  | mapping_block
  | metric_block
```

### Import

```
import { 'address fields', 'audit fields' } from "lib/common.stm"
```

Extracts: imported names, source path.

### Schema blocks

```
schema <name> (<metadata>) {
  <field_decl | record_block | list_block | fragment_spread | note_block>*
}
```

- Block label: bare identifier or single-quoted string.
- Metadata: zero or more `tag_token` or `key_value_pair` entries separated by commas.
- Fields: `<name>  <type>  (<metadata>)?`
  - Name: bare identifier or backtick-quoted.
  - Type: bare token with optional `(n)` or `(p,s)` parameter. Type is structurally captured but not semantically validated.
  - Metadata: same form as schema metadata, plus `note "..."` and `note """..."""`.
- Nested `record <name> (<metadata>) { ... }` and `list <name> (<metadata>) { ... }` recurse into the same field-body grammar.
- Fragment spreads: `...identifier` or `...'quoted name'`.

### Fragment blocks

```
fragment 'address fields' {
  <field declarations>
}
```

Same body grammar as schema. No metadata block on the `fragment` keyword itself.

### Named transform blocks

```
transform 'clean email' {
  <transform_body>
}
```

Transform body: a `pipe_chain` (see Mapping Arrows below).

### Mapping blocks

```
mapping <name>? (<metadata>)? {
  source { <source_body> }
  target { <target_body> }
  note_block?
  <arrow_decl>*
}
```

**Source body:** one or more backtick references, inline schema names, or NL strings (for join descriptions).

**Target body:** a single backtick reference or inline schema name.

**Arrow declarations:**

```
arrow_decl ::=
    map_arrow          // src_path -> tgt_path (<metadata>)? transform_body?
  | computed_arrow     // -> tgt_path (<metadata>)? transform_body?
  | nested_arrow       // src_path[] -> tgt_path[] (<metadata>)? { arrow_decl* }
```

**Transform body:** `{ pipe_chain }` where:

```
pipe_chain ::= pipe_step ("|" pipe_step)*

pipe_step ::=
    nl_string           // "..." or """..."""
  | token_call          // identifier with optional (args)
  | map_literal         // map { map_entry* }
  | fragment_spread     // ...name
```

Map entries: `map_key ":" map_value` where key is a token, string, number, comparison operator + value, `null`, `default`, or `_`.

**Structural detail required for arrows:**
- Source path: dotted path, relative path (`.field`), array path (`items[]`), or backtick path.
- Target path: same.
- Arrow metadata: `(note "...")`, `(pk)`, `(required)` etc. — same tag grammar.
- Nested arrows recurse.

### Metric blocks

`metric` is a first-class keyword — not a `schema` with a metadata token. Metrics are semantically different enough (they are consumers/derivations of schemas, not schemas themselves) to warrant their own node type.

```stm
metric monthly_recurring_revenue "MRR" (
  source fact_subscriptions,
  grain monthly,
  slice {customer_segment, product_line, region},
  filter "status = 'active' AND is_trial = false"
) {
  value  DECIMAL(14,2)  (measure additive)

  note {
    "Sum of active subscription amounts, normalized to monthly."
  }
}
```

Grammar shape:

```
metric_block ::=
  "metric" block_label metric_display_name? "(" metadata_block ")" "{" metric_body "}"

metric_display_name ::= string_literal   // the quoted "MRR" label

metric_body ::= (field_decl | note_block)*
```

The `source`, `grain`, `slice`, `filter` tokens inside the metadata block are vocabulary tokens — the grammar captures them as `key_value_pair` or `tag_token` nodes. The `slice { ... }` value is a brace-enclosed token list (same production as `enum { ... }` in field metadata).

The `measure` token and its qualifier (`additive`, `non_additive`, `semi_additive`) on field declarations inside metric bodies are also vocabulary tokens, captured structurally as `tag_token` sequences.

The parser must distinguish `metric_block` from `schema_block` so the CLI can query metrics separately from schemas.

### Note blocks

```
note {
  "short string"
}

note {
  """
  # Heading
  Markdown content
  """
}
```

Used at file level and inside mapping blocks. Captured as a distinct node with the string content preserved.

### Comments

Three kinds, all line-scoped:

| Token | Kind |
|-------|------|
| `//`  | Regular comment — stripped by tooling |
| `//!` | Warning comment — surfaced by linter |
| `//?` | Question/TODO comment — surfaced by linter |

All three must be distinct node types so tooling can query them separately.

---

## Extraction Targets

These are the CST queries that Feature 09 (CLI) and the language server must be able to express as tree-sitter queries. The grammar must expose structure at this granularity.

| Query | CST nodes required |
|---|---|
| All schema names and their metadata tokens | `schema_block`, `block_label`, `metadata_block`, `tag_token` |
| All fields in a schema with their types and metadata | `field_decl`, `field_name`, `type_expr`, `metadata_block` |
| All fields carrying a specific metadata token (e.g. `pii`) | `tag_token` inside `metadata_block` inside `field_decl` |
| All mapping blocks with their source and target schema names | `mapping_block`, `source_block`, `target_block`, `backtick_ref` |
| All arrows in a mapping with source and target paths | `map_arrow`, `computed_arrow`, `src_path`, `tgt_path` |
| All `//!` warning comments | `warning_comment` |
| All `//? ` question comments | `question_comment` |
| All fragment definitions and where they are spread | `fragment_block`, `fragment_spread` |
| All named transforms and where they are spread | `transform_block`, `fragment_spread` |
| All imports | `import_decl`, `import_name`, `import_path` |
| All note blocks with their content | `note_block`, `string_literal`, `multiline_string` |
| All metric blocks with name, display label, source schemas, grain, slice dimensions | `metric_block`, `block_label`, `metric_display_name`, `metadata_block` |
| All measure fields in a metric with additivity qualifier | `field_decl` inside `metric_body`, `tag_token[name=measure]` |
| All schemas that a metric depends on (its `source` metadata) | `metric_block` → `metadata_block` → `key_value_pair[key=source]` |
| All `enum` value sets on a field | `tag_token[name=enum]`, `enum_body` |
| All key-value metadata pairs (e.g. `format email`, `ref addresses.id`) | `key_value_pair`, `kv_key`, `kv_value` |

---

## Key Grammar Design Decisions

### Metadata block is open by design

`( )` contains a comma-separated list of tokens and key-value pairs. The grammar does **not** enumerate which tokens are valid — that is the linter's job. The parser accepts any token sequence and preserves it structurally.

### Type expressions are opaque-but-structured

`VARCHAR(255)`, `DECIMAL(12,2)`, `TIMESTAMPTZ` are all valid. The grammar captures the base token and optional parameter list, but does not validate type names.

### NL strings in transform bodies are captured whole

A `"..."` in a transform body is a single `nl_string` node containing the raw string. The parser does not interpret it. Its position in the pipe chain (first, middle, last) is visible from the tree.

### Map literals in transforms are fully structured

`map { R: "retail", _: "unknown" }` is parsed into `map_literal` → `map_entry*` → (`map_key`, `map_value`). This is important for the CLI's "find all value maps that map to X" query.

### Single-quoted block labels vs backtick field names

- Block labels (after `schema`, `mapping`, `fragment`, `transform`): bare identifier or **single-quoted** string.
- Field names and references inside bodies: bare identifier or **backtick-quoted** identifier.
- These are distinct token types.

### Nested `record` and `list` share the schema body grammar

They are recursive: a `list` can contain a `record` can contain a `list`. The grammar handles this with the same production as schema bodies.

### Comments are preserved, not stripped

All three comment types are captured as explicit CST nodes. This is essential for the CLI's ability to surface warnings and questions (`//!`, `//?`) without re-reading raw text.

---

## File Locations

- Grammar: `tooling/tree-sitter-satsuma/grammar.js` (replace existing)
- Tests: `tooling/tree-sitter-satsuma/test/corpus/` (replace existing, new corpus files by area)
- Highlights: `tooling/tree-sitter-satsuma/queries/highlights.scm` (replace existing)
- Folds: `tooling/tree-sitter-satsuma/queries/folds.scm`
- Locals: `tooling/tree-sitter-satsuma/queries/locals.scm` (for LSP scope resolution)
- Smoke-test script: `tooling/tree-sitter-satsuma/scripts/smoke-test.js`
- AST conventions doc: `tooling/tree-sitter-satsuma/docs/cst-reference.md`

The existing grammar, corpus, and queries are deleted and replaced entirely. v1 is considered retired.

---

## Risks

| Risk | Mitigation |
|---|---|
| Grammar conflicts in arrow bodies (NL strings vs token pipelines) | Write conflict tests first; rely on tree-sitter's ordered choice and extras for comments |
| Ambiguity between `->` in metadata and `->` as arrow operator | Metadata never contains `{ }` or `->`; parser context resolves this |
| Deeply nested `record`/`list` causing conflict or infinite recursion | Use tree-sitter's `repeat` + named recursion; test 3-level nesting explicitly |
| `map` keyword collision (value map literal vs named token) | `map` followed by `{` is always a `map_literal`; otherwise it is a `tag_token` |
| Open metadata token list makes recovery harder | Accept any token sequence in metadata; do not try to validate at parse time |
