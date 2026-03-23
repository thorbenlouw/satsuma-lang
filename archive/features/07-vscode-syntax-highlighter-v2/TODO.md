# TODO: VS Code Syntax Highlighter for Satsuma v2

> **Status: COMPLETED** (2026-03-18). Grammar rewritten, fixture + golden tests pass. Multi-schema support added.

## Phase 1: Taxonomy and Test Plan

- [ ] Write `HIGHLIGHTING-TAXONOMY.md` — canonical v2 token-to-scope mapping
  - [ ] Reserved keywords → scopes
  - [ ] Vocabulary tokens → scopes (constraints, operations, domain)
  - [ ] Operators → scopes
  - [ ] Comments → scopes (all three forms)
  - [ ] Strings → scopes (all four forms)
  - [ ] Literals → scopes
  - [ ] Type names → scopes
  - [ ] Identifiers (bare, backtick, dotted paths) → scopes
- [ ] Create test fixture files from v2 spec examples
  - [ ] `test/fixtures/schema-basic.stm` — simple schema with fields and metadata
  - [ ] `test/fixtures/schema-nested.stm` — record/list nesting
  - [ ] `test/fixtures/fragment-spread.stm` — fragment declaration and `...` usage
  - [ ] `test/fixtures/mapping-basic.stm` — source/target blocks, direct arrows
  - [ ] `test/fixtures/mapping-transforms.stm` — pipeline transforms, NL transforms
  - [ ] `test/fixtures/mapping-computed.stm` — computed fields (no left side of `->`)
  - [ ] `test/fixtures/map-block.stm` — `map {}` value mappings with conditions
  - [ ] `test/fixtures/import-statement.stm` — import/from syntax
  - [ ] `test/fixtures/note-block.stm` — `note {}` with `"""` triple-quoted content
  - [ ] `test/fixtures/comments.stm` — `//`, `//!`, `//?`
  - [ ] `test/fixtures/strings.stm` — all four string forms
  - [ ] `test/fixtures/transform-block.stm` — named `transform` declarations
  - [ ] `test/fixtures/nested-mapping.stm` — nested arrows with `.` relative paths
  - [ ] `test/fixtures/xml-metadata.stm` — xpath, namespace vocabulary in `()`
- [ ] Create malformed/editing-state fixtures
  - [ ] `test/fixtures/malformed/unterminated-string.stm`
  - [ ] `test/fixtures/malformed/unterminated-triple-quote.stm`
  - [ ] `test/fixtures/malformed/missing-brace.stm`
  - [ ] `test/fixtures/malformed/incomplete-arrow.stm`
  - [ ] `test/fixtures/malformed/partial-import.stm`
- [ ] Add `vscode-tmgrammar-test` scope assertions to each fixture

## Phase 2: Grammar Rewrite

### 2a: Strip v1-only patterns

- [ ] Remove `integration` keyword
- [ ] Remove `table`, `message`, `event`, `lookup` as declaration keywords
- [ ] Remove `=>` operator pattern
- [ ] Remove `@annotation(...)` patterns
- [ ] Remove `[tag, tag]` bracket-tag patterns
- [ ] Remove triple-single-quote `'''...'''` string pattern
- [ ] Remove `when`, `else`, `fallback` flow-control keywords

### 2b: Add v2 keyword patterns

- [ ] `schema` — declaration keyword with optional `(metadata)` and `{body}`
- [ ] `fragment` — declaration keyword
- [ ] `mapping` — declaration keyword with optional `(metadata)` and `{body}`
- [ ] `transform` — declaration keyword
- [ ] `record` — nested structure keyword (name-first: `NAME record { }`)
- [ ] `list_of` — list type keyword (name-first: `NAME list_of record { }`)
- [ ] `each` — iteration block keyword (in mapping bodies)
- [ ] `flatten` — flatten block keyword (in mapping bodies)
- [ ] `map` — value mapping keyword (inside mapping arrows)
- [ ] `note` — note keyword (both `note {}` blocks and `note "..."` in metadata)
- [ ] `import` / `from` — import statement keywords
- [ ] `source` / `target` — sub-block keywords inside mapping

### 2c: Add v2 string patterns

- [ ] `"""..."""` triple-double-quoted strings (multiline, begin/end pattern)
- [ ] `"..."` double-quoted strings (single-line, with `\"` escape)
- [ ] `` `...` `` backtick identifiers
- [ ] `'...'` single-quoted block labels

### 2d: Add v2 operator patterns

- [ ] `->` arrow operator
- [ ] `|` pipe operator
- [ ] `...` spread operator (before identifier/quoted name)
- [ ] `:` key-value separator (in map blocks)
- [ ] `each` and `flatten` block keywords

### 2e: Add vocabulary token patterns

- [ ] Constraint tokens in `()`: `pk`, `required`, `unique`, `indexed`, `pii`, `encrypt`
- [ ] Format tokens in `()`: `enum`, `default`, `format`, `ref`, `xpath`, `namespace`, `filter`, `note`
- [ ] Pipeline tokens in `{}`: `trim`, `lowercase`, `uppercase`, `coalesce`, `round`, `split`, `first`, `last`, `to_utc`, `to_iso8601`, `parse`, `null_if_empty`, `null_if_invalid`, `validate_email`, `now_utc`, `title_case`, `escape_html`, `truncate`, `to_number`, `prepend`, `max_length`
- [ ] Domain tokens: `datavault`, `hub`, `satellite`, `scd`, `hashkey`

### 2f: Add type name patterns

- [ ] Common SQL/data types: `STRING`, `VARCHAR`, `INT`, `INTEGER`, `BIGINT`, `DECIMAL`, `BOOLEAN`, `DATE`, `TIMESTAMPTZ`, `TIMESTAMP_NTZ`, `UUID`, `JSON`, `TEXT`, `CHAR`, `NUMBER`, `INT32`, `FLOAT`, `DOUBLE`
- [ ] Parameterized types: `VARCHAR(n)`, `DECIMAL(p,s)`, `CHAR(n)`, `NUMBER(p,s)`

### 2g: Field declaration pattern

- [ ] Match `name  TYPE  (metadata)` pattern inside schema/fragment/record/list bodies
- [ ] Scope field name as `variable.other.field.satsuma`
- [ ] Scope type as `support.type.satsuma`

### 2h: Mapping body patterns

- [ ] Direct arrow: `source -> target`
- [ ] Arrow with transform body: `source -> target { ... }`
- [ ] Computed field: `-> target { ... }`
- [ ] Dotted paths: `Order.Customer.Email`
- [ ] Nested paths: `LineItems.SKU`
- [ ] Relative paths: `.REFNUM`
- [ ] Arrow metadata: `source -> target (note "...") { ... }`

### 2i: Map block patterns

- [ ] `map { key: "value" }` basic form
- [ ] Conditional entries: `< 1000: "bronze"`
- [ ] Default/wildcard: `default:`, `_:`
- [ ] `null:` entry

## Phase 3: Validation

- [ ] Run `npm test` — all `vscode-tmgrammar-test` fixtures pass
- [ ] Test against `examples-v2/db-to-db.stm`
- [ ] Test against `examples-v2/edi-to-json.stm`
- [ ] Test against `examples-v2/xml-to-parquet.stm`
- [ ] Test against `examples-v2/sfdc_to_snowflake.stm`
- [ ] Test against `examples-v2/common.stm`
- [ ] Test against `examples-v2/protobuf-to-parquet.stm`
- [ ] Test against `examples-v2/multi-source-hub.stm`
- [ ] Visual inspection in VS Code Dark+ theme
- [ ] Visual inspection in VS Code Light+ theme
- [ ] Test malformed fixtures — verify no catastrophic over-scoping
- [ ] Verify unterminated `"""` does not paint rest of file as string

## Phase 4: Documentation

- [ ] Update `tooling/vscode-satsuma/README.md` — note v2 syntax support
- [ ] Update `tooling/vscode-satsuma/package.json` — bump version, update description
- [ ] Document known approximation limits (context-sensitive constructs)
  - [ ] `source`/`target` as keywords vs. field names
  - [ ] `map` as keyword vs. identifier
  - [ ] Vocabulary tokens that could be field names
  - [ ] Type names that could be field names
- [ ] Document semantic token candidates for future parser-backed phase

## Acceptance Checklist

- [ ] All v2 reserved keywords highlighted
- [ ] All four string forms work correctly
- [ ] All three comment forms have distinct scopes
- [ ] Operators (`->`, `|`, `...`) highlighted
- [ ] `map {}` blocks render correctly
- [ ] `record`/`list_of record` nesting works at any depth
- [ ] `import {} from ""` highlighted
- [ ] `note { """...""" }` blocks work
- [ ] Vocabulary tokens highlighted in context
- [ ] Type names highlighted in field declarations
- [ ] All `examples-v2/` files render correctly
- [ ] Fixture tests pass
- [ ] Malformed files degrade gracefully
