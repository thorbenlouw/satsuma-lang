# Satsuma v2 — Highlighting Taxonomy

Canonical mapping of every v2 token category to TextMate scopes.
This document is the single source of truth for the TextMate grammar rewrite.

---

## 1. Reserved Keywords

These introduce structural blocks. Scoped as `keyword.other.satsuma` — a generic keyword scope that themes universally style (typically bold/colored).

| Token | Context | Scope |
|-------|---------|-------|
| `schema` | Top-level declaration | `keyword.other.satsuma` |
| `fragment` | Top-level declaration | `keyword.other.satsuma` |
| `mapping` | Top-level declaration | `keyword.other.satsuma` |
| `transform` | Top-level declaration | `keyword.other.satsuma` |
| `record` | Nested structure (inside schema/record/list) | `keyword.other.satsuma` |
| `list` | Nested structure (inside schema/record/list) | `keyword.other.satsuma` |
| `map` | Value mapping block (inside arrow body `{}`) | `keyword.other.satsuma` |
| `note` | Documentation block or metadata token | `keyword.other.satsuma` |
| `import` | Import statement | `keyword.control.import.satsuma` |
| `from` | Import statement | `keyword.control.import.satsuma` |
| `source` | Sub-block inside mapping | `keyword.other.satsuma` |
| `target` | Sub-block inside mapping | `keyword.other.satsuma` |

**Design note:** `import` and `from` use `keyword.control.import` to match the convention used by JavaScript/TypeScript/Python grammars, giving themes a natural styling hook.

---

## 2. Vocabulary Tokens — Constraints

Appear in `()` metadata blocks. Scoped as `support.other.satsuma` — a neutral scope that themes style distinctly from keywords but not as prominently. These are not reserved and could legitimately be field names elsewhere.

| Token | Example | Scope |
|-------|---------|-------|
| `pk` | `(pk)` | `support.other.satsuma` |
| `required` | `(required)` | `support.other.satsuma` |
| `unique` | `(unique)` | `support.other.satsuma` |
| `indexed` | `(indexed)` | `support.other.satsuma` |
| `pii` | `(pii)` | `support.other.satsuma` |
| `encrypt` | `(encrypt AES-256-GCM)` | `support.other.satsuma` |

---

## 3. Vocabulary Tokens — Format/Metadata

Appear in `()` metadata blocks introducing key-value or key-block pairs.

| Token | Example | Scope |
|-------|---------|-------|
| `enum` | `(enum {active, closed})` | `support.other.satsuma` |
| `default` | `(default 0)` | `support.other.satsuma` |
| `format` | `(format email)` | `support.other.satsuma` |
| `ref` | `(ref addresses.id)` | `support.other.satsuma` |
| `xpath` | `(xpath "ord:OrderId")` | `support.other.satsuma` |
| `namespace` | `(namespace ord "http://...")` | `support.other.satsuma` |
| `filter` | `(filter QUAL == "ON")` | `support.other.satsuma` |
| `flatten` | `flatten Order.LineItems -> target { }` | `keyword.other.satsuma` |
| `note` | `(note "Short description")` | `support.other.satsuma` |

**Design note:** `note` appears both as a reserved keyword (`note { }` block) and a vocabulary token (`(note "...")` in metadata). Inside `()`, it is scoped as `support.other.satsuma`. At block level, it is scoped as `keyword.other.satsuma`. TextMate can handle this because the two contexts use different grammar rules.

---

## 4. Vocabulary Tokens — Pipeline Operations

Appear in `{}` arrow bodies as pipeline steps separated by `|`. Scoped as `support.function.satsuma` — matches how themes style built-in functions.

| Token | Example | Scope |
|-------|---------|-------|
| `trim` | `{ trim }` | `support.function.satsuma` |
| `lowercase` | `{ lowercase }` | `support.function.satsuma` |
| `uppercase` | `{ uppercase }` | `support.function.satsuma` |
| `coalesce` | `{ coalesce(0) }` | `support.function.satsuma` |
| `round` | `{ round(2) }` | `support.function.satsuma` |
| `split` | `{ split("/") }` | `support.function.satsuma` |
| `first` | `{ first }` | `support.function.satsuma` |
| `last` | `{ last }` | `support.function.satsuma` |
| `to_utc` | `{ to_utc }` | `support.function.satsuma` |
| `to_iso8601` | `{ to_iso8601 }` | `support.function.satsuma` |
| `parse` | `{ parse("MM/DD/YYYY") }` | `support.function.satsuma` |
| `null_if_empty` | `{ null_if_empty }` | `support.function.satsuma` |
| `null_if_invalid` | `{ null_if_invalid }` | `support.function.satsuma` |
| `validate_email` | `{ validate_email }` | `support.function.satsuma` |
| `now_utc` | `{ now_utc() }` | `support.function.satsuma` |
| `title_case` | `{ title_case }` | `support.function.satsuma` |
| `escape_html` | `{ escape_html }` | `support.function.satsuma` |
| `truncate` | `{ truncate(5000) }` | `support.function.satsuma` |
| `to_number` | `{ to_number }` | `support.function.satsuma` |
| `prepend` | `{ prepend("prefix") }` | `support.function.satsuma` |
| `max_length` | `{ max_length(30) }` | `support.function.satsuma` |
| `assume_utc` | `{ assume_utc }` | `support.function.satsuma` |
| `join` | `{ join }` | `support.function.satsuma` |
| `each` | `each src -> tgt { }` | `keyword.other.satsuma` |

**Grammar strategy:** Match known pipeline tokens by name, but also match any `\w+` followed by `(` as `entity.name.function.satsuma` to catch unknown pipeline functions gracefully.

---

## 5. Vocabulary Tokens — Domain

Appear in `()` metadata or as identifiers in specialized contexts. Scoped as `support.other.satsuma`.

| Token | Domain | Scope |
|-------|--------|-------|
| `datavault` | Data Vault | `support.other.satsuma` |
| `hub` | Data Vault | `support.other.satsuma` |
| `satellite` | Data Vault | `support.other.satsuma` |
| `link` | Data Vault | `support.other.satsuma` |
| `scd` | Data Vault | `support.other.satsuma` |
| `hashkey` | Data Vault | `support.other.satsuma` |
| `watermark` | Streaming | `support.other.satsuma` |
| `late_arrival` | Streaming | `support.other.satsuma` |
| `dedup` | Streaming | `support.other.satsuma` |
| `classification` | Governance | `support.other.satsuma` |
| `retention` | Governance | `support.other.satsuma` |
| `lineage` | Governance | `support.other.satsuma` |

---

## 6. Operators

| Operator | Context | Scope |
|----------|---------|-------|
| `->` | Maps source to target; computed field (no left side) | `keyword.operator.arrow.satsuma` |
| `\|` | Pipeline step separator in `{}` bodies | `keyword.operator.pipe.satsuma` |
| `...` | Spread/expand fragment or transform | `keyword.operator.spread.satsuma` |
| `:` | Key-value separator in `map {}` entries | `punctuation.separator.key-value.satsuma` |
| `.` | Field accessor / path separator (e.g., `Order.Customer.Email`) | _not separately scoped_ — part of the identifier |
| `<` `<=` `>` `>=` | Comparison operators in conditional `map {}` entries | `keyword.operator.comparison.satsuma` |

**Design note:** The `.` accessor is not separately scoped because dotted paths should read as a single identifier. Scoping each `.` separately would fragment the path visually.

---

## 7. Comments

All three forms run to end of line. No block comments exist.

| Syntax | Semantic | Scope |
|--------|----------|-------|
| `//` | Author-side comment (stripped by tooling) | `comment.line.double-slash.satsuma` |
| `//!` | Warning flag (surfaced by tooling) | `comment.line.double-slash.warning.satsuma` |
| `//?` | Question / TODO (open item) | `comment.line.double-slash.question.satsuma` |

**Grammar order:** Match `//!` and `//?` before `//` — the more specific patterns must come first.

**Rendering note:** Warning (`//!`) and question (`//?`) comments inherit `comment.line` styling from themes but their sub-scopes allow theme authors to add distinct colors. Most themes will render all three as comment-colored text, which is acceptable.

---

## 8. Strings

Four distinct string forms with different scopes and semantics.

### 8.1 Double-Quoted Strings

```
"Natural language description"
```

| Element | Scope |
|---------|-------|
| Opening `"` | `punctuation.definition.string.begin.satsuma` |
| Content | `string.quoted.double.satsuma` |
| Escape `\"` | `constant.character.escape.satsuma` |
| Closing `"` | `punctuation.definition.string.end.satsuma` |

### 8.2 Triple-Double-Quoted Strings

```
"""
Multiline Markdown content
"""
```

| Element | Scope |
|---------|-------|
| Opening `"""` | `punctuation.definition.string.begin.satsuma` |
| Content | `string.quoted.triple.satsuma` |
| Closing `"""` | `punctuation.definition.string.end.satsuma` |

**Grammar note:** The `"""` begin pattern must be matched before `"` to avoid consuming the first quote as a single-line string. Order: triple-double first, then single-double.

### 8.3 Backtick Identifiers

```
`Lead_Source_Detail__c`
`legacy_sqlserver`
```

| Element | Scope |
|---------|-------|
| Opening `` ` `` | `punctuation.definition.identifier.begin.satsuma` |
| Content | `entity.name.tag.satsuma` |
| Closing `` ` `` | `punctuation.definition.identifier.end.satsuma` |

**Design note:** `entity.name.tag` is chosen because backtick identifiers are name references — they refer to schemas, fields, or external names that may contain special characters. Themes universally style `entity.name.tag` distinctly (often a contrasting color), making references visually prominent.

### 8.4 Single-Quoted Block Labels

```
schema 'order-headers-parquet' { ... }
fragment 'US Address' { ... }
mapping 'customer migration' { ... }
```

| Element | Scope |
|---------|-------|
| Opening `'` | `punctuation.definition.string.begin.satsuma` |
| Content | `string.quoted.single.satsuma` |
| Closing `'` | `punctuation.definition.string.end.satsuma` |

**Design note:** Block labels use `string.quoted.single` rather than `entity.name` because they appear directly after keywords and serve as syntactic labels, not semantic references. Themes style strings distinctly, which is appropriate — the label is a name literal.

---

## 9. Literals and Constants

| Form | Example | Scope |
|------|---------|-------|
| Integer | `42`, `10000`, `0` | `constant.numeric.integer.satsuma` |
| Decimal | `3.14`, `12.2` | `constant.numeric.float.satsuma` |
| `null` | `null: "retail"` in map | `constant.language.null.satsuma` |
| `true` / `false` | Boolean values | `constant.language.boolean.satsuma` |
| `default` | Catch-all in map block | `keyword.control.default.satsuma` |
| `_` | Wildcard catch-all in map block | `keyword.control.default.satsuma` |

**Grammar note:** Numbers inside `()` (e.g., `VARCHAR(255)`, `DECIMAL(12,2)`) are type parameters — they should be scoped as `constant.numeric` within the type-parameter context.

---

## 10. Type Names

Common data types in field declarations. Scoped as `support.type.satsuma`.

**Pattern:** Uppercase or CamelCase identifiers in the type position of a field declaration (after the field name, before optional `()`).

| Type | Example | Scope |
|------|---------|-------|
| `STRING` | `name STRING` | `support.type.satsuma` |
| `VARCHAR` | `name VARCHAR(200)` | `support.type.satsuma` |
| `INT` | `count INT` | `support.type.satsuma` |
| `INTEGER` | `count INTEGER` | `support.type.satsuma` |
| `BIGINT` | `amount BIGINT` | `support.type.satsuma` |
| `DECIMAL` | `price DECIMAL(12,2)` | `support.type.satsuma` |
| `CHAR` | `code CHAR(2)` | `support.type.satsuma` |
| `BOOLEAN` | `is_active BOOLEAN` | `support.type.satsuma` |
| `DATE` | `created DATE` | `support.type.satsuma` |
| `TIMESTAMPTZ` | `created_at TIMESTAMPTZ` | `support.type.satsuma` |
| `TIMESTAMP_NTZ` | `ingested_at TIMESTAMP_NTZ` | `support.type.satsuma` |
| `UUID` | `id UUID` | `support.type.satsuma` |
| `JSON` | `data JSON` | `support.type.satsuma` |
| `TEXT` | `body TEXT` | `support.type.satsuma` |
| `NUMBER` | `qty NUMBER(15)` | `support.type.satsuma` |
| `INT32` | `line INT32` | `support.type.satsuma` |
| `FLOAT` | `ratio FLOAT` | `support.type.satsuma` |
| `DOUBLE` | `amount DOUBLE` | `support.type.satsuma` |
| `CURRENCY` | `amount CURRENCY(18,2)` | `support.type.satsuma` |
| `PICKLIST` | `stage PICKLIST` | `support.type.satsuma` |
| `ID` | `sf_id ID` (Salesforce) | `support.type.satsuma` |
| `PERCENT` | `prob PERCENT(3,0)` | `support.type.satsuma` |
| `DATETIME` | `ts DATETIME` | `support.type.satsuma` |

**Grammar strategy:** Match by enumerated list in the type position. Also match any `ALL_CAPS` identifier in type position as `support.type.satsuma` to handle unenumerated types gracefully.

**Type parameters:** `(n)`, `(p,s)` after type names — scope the parentheses as `punctuation.definition.parameters.satsuma` and the numbers inside as `constant.numeric`.

---

## 11. Identifiers

### 11.1 Bare Identifiers

Unquoted names used for fields, schema names, and references.

| Context | Example | Scope |
|---------|---------|-------|
| Block name after keyword | `schema customers` | `entity.name.type.satsuma` |
| Field name in declaration | `customer_id UUID` | `variable.other.field.satsuma` |
| Source field in arrow (left of `->`) | `EMAIL_ADDR -> email` | `variable.other.field.satsuma` |
| Target field in arrow (right of `->`) | `EMAIL_ADDR -> email` | `variable.other.field.satsuma` |
| Dotted path | `Order.Customer.Email` | `variable.other.field.satsuma` (entire path) |
| Relative path (`.` prefix) | `.REFNUM` | `variable.other.field.satsuma` |

**Design note:** Block names after keywords use `entity.name.type` because they declare a named structural entity (schema, fragment, mapping, transform, record, list). This scope receives prominent styling in most themes.

### 11.2 Backtick Identifiers

See [Section 8.3](#83-backtick-identifiers) — scoped as `entity.name.tag.satsuma`.

### 11.3 Dotted Paths

`Order.Customer.Email`, `Order.LineItems.SKU`

Scoped as a single `variable.other.field.satsuma` span. The `.` separators are part of the token. This avoids visual fragmentation of field paths.

---

## 12. Punctuation and Delimiters

| Element | Scope |
|---------|-------|
| `{` / `}` (structural content) | `punctuation.section.block.begin.satsuma` / `punctuation.section.block.end.satsuma` |
| `(` / `)` (metadata) | `punctuation.section.parens.begin.satsuma` / `punctuation.section.parens.end.satsuma` |
| `,` (separator in metadata, imports, enum values) | `punctuation.separator.comma.satsuma` |

---

## 13. Structural Contexts (Grammar Nesting)

The TextMate grammar should define these as nested contexts (using `begin`/`end` patterns) to enable context-sensitive scoping:

| Context | Entered By | Contains | Exited By |
|---------|-----------|----------|-----------|
| `meta.block.schema.satsuma` | `schema <name> {` | Field declarations, record/list, note blocks, spread | `}` |
| `meta.block.fragment.satsuma` | `fragment <name> {` | Field declarations, spread | `}` |
| `meta.block.mapping.satsuma` | `mapping <name> {` | source/target blocks, arrows, note blocks, map blocks | `}` |
| `meta.block.transform.satsuma` | `transform <name> {` | Pipeline tokens, strings, pipe operators | `}` |
| `meta.block.record.satsuma` | `record <name> {` | Field declarations, nested record/list | `}` |
| `meta.block.list.satsuma` | `list <name> {` | Field declarations, nested record/list | `}` |
| `meta.block.map.satsuma` | `map {` | Map entries (key: value), default/_ catch-all | `}` |
| `meta.block.note.satsuma` | `note {` | Strings (single-line and triple-quoted) | `}` |
| `meta.metadata.satsuma` | `(` after element | Vocabulary tokens, strings, numbers, commas | `)` |
| `meta.arrow-body.satsuma` | `{` after `->` target | Pipeline tokens, strings, pipe operators, map blocks, nested arrows | `}` |
| `meta.import.satsuma` | `import` | `{`, names, `}`, `from`, path string | end of statement |

---

## 14. Known Approximation Limits

These constructs cannot be perfectly scoped by a TextMate grammar and are candidates for semantic tokens once a parser/LSP exists.

| Construct | Ambiguity | TextMate Behavior | Semantic Token Candidate |
|-----------|-----------|-------------------|--------------------------|
| `source` / `target` as keyword vs. field name | `source` is a keyword inside `mapping {}` but a valid field name in `schema {}` | Highlighted as keyword everywhere | Yes — parser can distinguish |
| `map` as keyword vs. field name | `map` introduces a value mapping block but could be a field name | Highlighted as keyword everywhere | Yes |
| `list` / `record` as keyword vs. field name | Keyword in schema bodies but could be field names | Highlighted as keyword in schema bodies | Yes |
| Pipeline tokens as field names | `trim`, `filter`, `format` could be field names | Not highlighted as pipeline tokens in field position — only matched inside `{}` arrow bodies | Partially resolved by context |
| Vocabulary tokens as field names | `status`, `type`, `name` are not vocabulary tokens so no conflict; but `filter`, `format` could appear as field names | Matched only in `()` metadata context | Partially resolved by context |
| Type names that are field names | An all-caps field name like `STATUS CHAR(1)` — is `STATUS` a type or field? | Matched by position (second token = type) | Yes |
| Block name vs. first field | `schema customers {` — `customers` is a block name, not a field | Matched by adjacency to keyword | Partially resolved by position |

---

## 15. Scope Summary Table

Quick reference sorted by scope name.

| Scope | Used For |
|-------|----------|
| `comment.line.double-slash.question.satsuma` | `//?` question/TODO comments |
| `comment.line.double-slash.satsuma` | `//` author comments |
| `comment.line.double-slash.warning.satsuma` | `//!` warning comments |
| `constant.character.escape.satsuma` | `\"` escape in double-quoted strings |
| `constant.language.boolean.satsuma` | `true`, `false` |
| `constant.language.null.satsuma` | `null` |
| `constant.numeric.float.satsuma` | Decimal numbers (`3.14`) |
| `constant.numeric.integer.satsuma` | Integer numbers (`42`) |
| `entity.name.function.satsuma` | Unknown pipeline functions (fallback for `identifier(`) |
| `entity.name.tag.satsuma` | Backtick identifier content |
| `entity.name.type.satsuma` | Block names after keywords (`schema customers`) |
| `keyword.control.default.satsuma` | `default`, `_` catch-all in map blocks |
| `keyword.control.import.satsuma` | `import`, `from` |
| `keyword.operator.arrow.satsuma` | `->` |
| `keyword.operator.comparison.satsuma` | `<`, `<=`, `>`, `>=` in map conditions |
| `keyword.operator.pipe.satsuma` | `\|` |
| `keyword.operator.spread.satsuma` | `...` |
| `keyword.other.satsuma` | Reserved keywords (`schema`, `fragment`, `mapping`, etc.) |
| `meta.arrow-body.satsuma` | Arrow transform body `{ ... }` |
| `meta.block.fragment.satsuma` | Fragment block |
| `meta.block.list.satsuma` | List block |
| `meta.block.map.satsuma` | Map block |
| `meta.block.mapping.satsuma` | Mapping block |
| `meta.block.note.satsuma` | Note block |
| `meta.block.record.satsuma` | Record block |
| `meta.block.schema.satsuma` | Schema block |
| `meta.block.transform.satsuma` | Transform block |
| `meta.import.satsuma` | Import statement |
| `meta.metadata.satsuma` | Metadata `()` blocks |
| `punctuation.definition.identifier.begin.satsuma` | Opening `` ` `` |
| `punctuation.definition.identifier.end.satsuma` | Closing `` ` `` |
| `punctuation.definition.parameters.satsuma` | `()` around type parameters |
| `punctuation.definition.string.begin.satsuma` | Opening `"`, `"""`, `'` |
| `punctuation.definition.string.end.satsuma` | Closing `"`, `"""`, `'` |
| `punctuation.section.block.begin.satsuma` | `{` |
| `punctuation.section.block.end.satsuma` | `}` |
| `punctuation.section.parens.begin.satsuma` | `(` |
| `punctuation.section.parens.end.satsuma` | `)` |
| `punctuation.separator.comma.satsuma` | `,` |
| `punctuation.separator.key-value.satsuma` | `:` in map entries |
| `string.quoted.double.satsuma` | Double-quoted string content |
| `string.quoted.single.satsuma` | Single-quoted block label content |
| `string.quoted.triple.satsuma` | Triple-double-quoted string content |
| `support.function.satsuma` | Known pipeline operation tokens |
| `support.other.satsuma` | Vocabulary tokens (constraints, format, domain) |
| `support.type.satsuma` | Data type names (`VARCHAR`, `INT`, `UUID`, etc.) |
| `variable.other.field.satsuma` | Field names, dotted paths, relative paths |
