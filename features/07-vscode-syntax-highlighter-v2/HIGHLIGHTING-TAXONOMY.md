# STM v2 — Highlighting Taxonomy

Canonical mapping of every v2 token category to TextMate scopes.
This document is the single source of truth for the TextMate grammar rewrite.

---

## 1. Reserved Keywords

These introduce structural blocks. Scoped as `keyword.other.stm` — a generic keyword scope that themes universally style (typically bold/colored).

| Token | Context | Scope |
|-------|---------|-------|
| `schema` | Top-level declaration | `keyword.other.stm` |
| `fragment` | Top-level declaration | `keyword.other.stm` |
| `mapping` | Top-level declaration | `keyword.other.stm` |
| `transform` | Top-level declaration | `keyword.other.stm` |
| `record` | Nested structure (inside schema/record/list) | `keyword.other.stm` |
| `list` | Nested structure (inside schema/record/list) | `keyword.other.stm` |
| `map` | Value mapping block (inside arrow body `{}`) | `keyword.other.stm` |
| `note` | Documentation block or metadata token | `keyword.other.stm` |
| `import` | Import statement | `keyword.control.import.stm` |
| `from` | Import statement | `keyword.control.import.stm` |
| `source` | Sub-block inside mapping | `keyword.other.stm` |
| `target` | Sub-block inside mapping | `keyword.other.stm` |

**Design note:** `import` and `from` use `keyword.control.import` to match the convention used by JavaScript/TypeScript/Python grammars, giving themes a natural styling hook.

---

## 2. Vocabulary Tokens — Constraints

Appear in `()` metadata blocks. Scoped as `support.other.stm` — a neutral scope that themes style distinctly from keywords but not as prominently. These are not reserved and could legitimately be field names elsewhere.

| Token | Example | Scope |
|-------|---------|-------|
| `pk` | `(pk)` | `support.other.stm` |
| `required` | `(required)` | `support.other.stm` |
| `unique` | `(unique)` | `support.other.stm` |
| `indexed` | `(indexed)` | `support.other.stm` |
| `pii` | `(pii)` | `support.other.stm` |
| `encrypt` | `(encrypt AES-256-GCM)` | `support.other.stm` |

---

## 3. Vocabulary Tokens — Format/Metadata

Appear in `()` metadata blocks introducing key-value or key-block pairs.

| Token | Example | Scope |
|-------|---------|-------|
| `enum` | `(enum {active, closed})` | `support.other.stm` |
| `default` | `(default 0)` | `support.other.stm` |
| `format` | `(format email)` | `support.other.stm` |
| `ref` | `(ref addresses.id)` | `support.other.stm` |
| `xpath` | `(xpath "ord:OrderId")` | `support.other.stm` |
| `namespace` | `(namespace ord "http://...")` | `support.other.stm` |
| `filter` | `(filter QUAL == "ON")` | `support.other.stm` |
| `flatten` | `(flatten \`Order.LineItems[]\`)` | `support.other.stm` |
| `note` | `(note "Short description")` | `support.other.stm` |

**Design note:** `note` appears both as a reserved keyword (`note { }` block) and a vocabulary token (`(note "...")` in metadata). Inside `()`, it is scoped as `support.other.stm`. At block level, it is scoped as `keyword.other.stm`. TextMate can handle this because the two contexts use different grammar rules.

---

## 4. Vocabulary Tokens — Pipeline Operations

Appear in `{}` arrow bodies as pipeline steps separated by `|`. Scoped as `support.function.stm` — matches how themes style built-in functions.

| Token | Example | Scope |
|-------|---------|-------|
| `trim` | `{ trim }` | `support.function.stm` |
| `lowercase` | `{ lowercase }` | `support.function.stm` |
| `uppercase` | `{ uppercase }` | `support.function.stm` |
| `coalesce` | `{ coalesce(0) }` | `support.function.stm` |
| `round` | `{ round(2) }` | `support.function.stm` |
| `split` | `{ split("/") }` | `support.function.stm` |
| `first` | `{ first }` | `support.function.stm` |
| `last` | `{ last }` | `support.function.stm` |
| `to_utc` | `{ to_utc }` | `support.function.stm` |
| `to_iso8601` | `{ to_iso8601 }` | `support.function.stm` |
| `parse` | `{ parse("MM/DD/YYYY") }` | `support.function.stm` |
| `null_if_empty` | `{ null_if_empty }` | `support.function.stm` |
| `null_if_invalid` | `{ null_if_invalid }` | `support.function.stm` |
| `validate_email` | `{ validate_email }` | `support.function.stm` |
| `now_utc` | `{ now_utc() }` | `support.function.stm` |
| `title_case` | `{ title_case }` | `support.function.stm` |
| `escape_html` | `{ escape_html }` | `support.function.stm` |
| `truncate` | `{ truncate(5000) }` | `support.function.stm` |
| `to_number` | `{ to_number }` | `support.function.stm` |
| `prepend` | `{ prepend("prefix") }` | `support.function.stm` |
| `max_length` | `{ max_length(30) }` | `support.function.stm` |
| `assume_utc` | `{ assume_utc }` | `support.function.stm` |
| `join` | `{ join }` | `support.function.stm` |
| `flatten` | `{ flatten }` | `support.function.stm` |

**Grammar strategy:** Match known pipeline tokens by name, but also match any `\w+` followed by `(` as `entity.name.function.stm` to catch unknown pipeline functions gracefully.

---

## 5. Vocabulary Tokens — Domain

Appear in `()` metadata or as identifiers in specialized contexts. Scoped as `support.other.stm`.

| Token | Domain | Scope |
|-------|--------|-------|
| `datavault` | Data Vault | `support.other.stm` |
| `hub` | Data Vault | `support.other.stm` |
| `satellite` | Data Vault | `support.other.stm` |
| `link` | Data Vault | `support.other.stm` |
| `scd` | Data Vault | `support.other.stm` |
| `hashkey` | Data Vault | `support.other.stm` |
| `watermark` | Streaming | `support.other.stm` |
| `late_arrival` | Streaming | `support.other.stm` |
| `dedup` | Streaming | `support.other.stm` |
| `classification` | Governance | `support.other.stm` |
| `retention` | Governance | `support.other.stm` |
| `lineage` | Governance | `support.other.stm` |

---

## 6. Operators

| Operator | Context | Scope |
|----------|---------|-------|
| `->` | Maps source to target; computed field (no left side) | `keyword.operator.arrow.stm` |
| `\|` | Pipeline step separator in `{}` bodies | `keyword.operator.pipe.stm` |
| `...` | Spread/expand fragment or transform | `keyword.operator.spread.stm` |
| `:` | Key-value separator in `map {}` entries | `punctuation.separator.key-value.stm` |
| `.` | Field accessor / path separator (e.g., `Order.Customer.Email`) | _not separately scoped_ — part of the identifier |
| `[]` | Array indicator on paths (e.g., `LineItems[]`) | `punctuation.definition.array.stm` |
| `<` `<=` `>` `>=` | Comparison operators in conditional `map {}` entries | `keyword.operator.comparison.stm` |

**Design note:** The `.` accessor is not separately scoped because dotted paths should read as a single identifier. Scoping each `.` separately would fragment the path visually. The `[]` brackets are scoped because they indicate structural semantics (repeated element).

---

## 7. Comments

All three forms run to end of line. No block comments exist.

| Syntax | Semantic | Scope |
|--------|----------|-------|
| `//` | Author-side comment (stripped by tooling) | `comment.line.double-slash.stm` |
| `//!` | Warning flag (surfaced by tooling) | `comment.line.double-slash.warning.stm` |
| `//?` | Question / TODO (open item) | `comment.line.double-slash.question.stm` |

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
| Opening `"` | `punctuation.definition.string.begin.stm` |
| Content | `string.quoted.double.stm` |
| Escape `\"` | `constant.character.escape.stm` |
| Closing `"` | `punctuation.definition.string.end.stm` |

### 8.2 Triple-Double-Quoted Strings

```
"""
Multiline Markdown content
"""
```

| Element | Scope |
|---------|-------|
| Opening `"""` | `punctuation.definition.string.begin.stm` |
| Content | `string.quoted.triple.stm` |
| Closing `"""` | `punctuation.definition.string.end.stm` |

**Grammar note:** The `"""` begin pattern must be matched before `"` to avoid consuming the first quote as a single-line string. Order: triple-double first, then single-double.

### 8.3 Backtick Identifiers

```
`Lead_Source_Detail__c`
`legacy_sqlserver`
```

| Element | Scope |
|---------|-------|
| Opening `` ` `` | `punctuation.definition.identifier.begin.stm` |
| Content | `entity.name.tag.stm` |
| Closing `` ` `` | `punctuation.definition.identifier.end.stm` |

**Design note:** `entity.name.tag` is chosen because backtick identifiers are name references — they refer to schemas, fields, or external names that may contain special characters. Themes universally style `entity.name.tag` distinctly (often a contrasting color), making references visually prominent.

### 8.4 Single-Quoted Block Labels

```
schema 'order-headers-parquet' { ... }
fragment 'US Address' { ... }
mapping 'customer migration' { ... }
```

| Element | Scope |
|---------|-------|
| Opening `'` | `punctuation.definition.string.begin.stm` |
| Content | `string.quoted.single.stm` |
| Closing `'` | `punctuation.definition.string.end.stm` |

**Design note:** Block labels use `string.quoted.single` rather than `entity.name` because they appear directly after keywords and serve as syntactic labels, not semantic references. Themes style strings distinctly, which is appropriate — the label is a name literal.

---

## 9. Literals and Constants

| Form | Example | Scope |
|------|---------|-------|
| Integer | `42`, `10000`, `0` | `constant.numeric.integer.stm` |
| Decimal | `3.14`, `12.2` | `constant.numeric.float.stm` |
| `null` | `null: "retail"` in map | `constant.language.null.stm` |
| `true` / `false` | Boolean values | `constant.language.boolean.stm` |
| `default` | Catch-all in map block | `keyword.control.default.stm` |
| `_` | Wildcard catch-all in map block | `keyword.control.default.stm` |

**Grammar note:** Numbers inside `()` (e.g., `VARCHAR(255)`, `DECIMAL(12,2)`) are type parameters — they should be scoped as `constant.numeric` within the type-parameter context.

---

## 10. Type Names

Common data types in field declarations. Scoped as `support.type.stm`.

**Pattern:** Uppercase or CamelCase identifiers in the type position of a field declaration (after the field name, before optional `()`).

| Type | Example | Scope |
|------|---------|-------|
| `STRING` | `name STRING` | `support.type.stm` |
| `VARCHAR` | `name VARCHAR(200)` | `support.type.stm` |
| `INT` | `count INT` | `support.type.stm` |
| `INTEGER` | `count INTEGER` | `support.type.stm` |
| `BIGINT` | `amount BIGINT` | `support.type.stm` |
| `DECIMAL` | `price DECIMAL(12,2)` | `support.type.stm` |
| `CHAR` | `code CHAR(2)` | `support.type.stm` |
| `BOOLEAN` | `is_active BOOLEAN` | `support.type.stm` |
| `DATE` | `created DATE` | `support.type.stm` |
| `TIMESTAMPTZ` | `created_at TIMESTAMPTZ` | `support.type.stm` |
| `TIMESTAMP_NTZ` | `ingested_at TIMESTAMP_NTZ` | `support.type.stm` |
| `UUID` | `id UUID` | `support.type.stm` |
| `JSON` | `data JSON` | `support.type.stm` |
| `TEXT` | `body TEXT` | `support.type.stm` |
| `NUMBER` | `qty NUMBER(15)` | `support.type.stm` |
| `INT32` | `line INT32` | `support.type.stm` |
| `FLOAT` | `ratio FLOAT` | `support.type.stm` |
| `DOUBLE` | `amount DOUBLE` | `support.type.stm` |
| `CURRENCY` | `amount CURRENCY(18,2)` | `support.type.stm` |
| `PICKLIST` | `stage PICKLIST` | `support.type.stm` |
| `ID` | `sf_id ID` (Salesforce) | `support.type.stm` |
| `PERCENT` | `prob PERCENT(3,0)` | `support.type.stm` |
| `DATETIME` | `ts DATETIME` | `support.type.stm` |

**Grammar strategy:** Match by enumerated list in the type position. Also match any `ALL_CAPS` identifier in type position as `support.type.stm` to handle unenumerated types gracefully.

**Type parameters:** `(n)`, `(p,s)` after type names — scope the parentheses as `punctuation.definition.parameters.stm` and the numbers inside as `constant.numeric`.

---

## 11. Identifiers

### 11.1 Bare Identifiers

Unquoted names used for fields, schema names, and references.

| Context | Example | Scope |
|---------|---------|-------|
| Block name after keyword | `schema customers` | `entity.name.type.stm` |
| Field name in declaration | `customer_id UUID` | `variable.other.field.stm` |
| Source field in arrow (left of `->`) | `EMAIL_ADDR -> email` | `variable.other.field.stm` |
| Target field in arrow (right of `->`) | `EMAIL_ADDR -> email` | `variable.other.field.stm` |
| Dotted path | `Order.Customer.Email` | `variable.other.field.stm` (entire path) |
| Relative path (`.` prefix) | `.REFNUM` | `variable.other.field.stm` |

**Design note:** Block names after keywords use `entity.name.type` because they declare a named structural entity (schema, fragment, mapping, transform, record, list). This scope receives prominent styling in most themes.

### 11.2 Backtick Identifiers

See [Section 8.3](#83-backtick-identifiers) — scoped as `entity.name.tag.stm`.

### 11.3 Dotted Paths

`Order.Customer.Email`, `Order.LineItems[].SKU`

Scoped as a single `variable.other.field.stm` span. The `.` separators and `[]` indicators are part of the token. This avoids visual fragmentation of field paths.

---

## 12. Punctuation and Delimiters

| Element | Scope |
|---------|-------|
| `{` / `}` (structural content) | `punctuation.section.block.begin.stm` / `punctuation.section.block.end.stm` |
| `(` / `)` (metadata) | `punctuation.section.parens.begin.stm` / `punctuation.section.parens.end.stm` |
| `,` (separator in metadata, imports, enum values) | `punctuation.separator.comma.stm` |

---

## 13. Structural Contexts (Grammar Nesting)

The TextMate grammar should define these as nested contexts (using `begin`/`end` patterns) to enable context-sensitive scoping:

| Context | Entered By | Contains | Exited By |
|---------|-----------|----------|-----------|
| `meta.block.schema.stm` | `schema <name> {` | Field declarations, record/list, note blocks, spread | `}` |
| `meta.block.fragment.stm` | `fragment <name> {` | Field declarations, spread | `}` |
| `meta.block.mapping.stm` | `mapping <name> {` | source/target blocks, arrows, note blocks, map blocks | `}` |
| `meta.block.transform.stm` | `transform <name> {` | Pipeline tokens, strings, pipe operators | `}` |
| `meta.block.record.stm` | `record <name> {` | Field declarations, nested record/list | `}` |
| `meta.block.list.stm` | `list <name> {` | Field declarations, nested record/list | `}` |
| `meta.block.map.stm` | `map {` | Map entries (key: value), default/_ catch-all | `}` |
| `meta.block.note.stm` | `note {` | Strings (single-line and triple-quoted) | `}` |
| `meta.metadata.stm` | `(` after element | Vocabulary tokens, strings, numbers, commas | `)` |
| `meta.arrow-body.stm` | `{` after `->` target | Pipeline tokens, strings, pipe operators, map blocks, nested arrows | `}` |
| `meta.import.stm` | `import` | `{`, names, `}`, `from`, path string | end of statement |

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
| `comment.line.double-slash.question.stm` | `//?` question/TODO comments |
| `comment.line.double-slash.stm` | `//` author comments |
| `comment.line.double-slash.warning.stm` | `//!` warning comments |
| `constant.character.escape.stm` | `\"` escape in double-quoted strings |
| `constant.language.boolean.stm` | `true`, `false` |
| `constant.language.null.stm` | `null` |
| `constant.numeric.float.stm` | Decimal numbers (`3.14`) |
| `constant.numeric.integer.stm` | Integer numbers (`42`) |
| `entity.name.function.stm` | Unknown pipeline functions (fallback for `identifier(`) |
| `entity.name.tag.stm` | Backtick identifier content |
| `entity.name.type.stm` | Block names after keywords (`schema customers`) |
| `keyword.control.default.stm` | `default`, `_` catch-all in map blocks |
| `keyword.control.import.stm` | `import`, `from` |
| `keyword.operator.arrow.stm` | `->` |
| `keyword.operator.comparison.stm` | `<`, `<=`, `>`, `>=` in map conditions |
| `keyword.operator.pipe.stm` | `\|` |
| `keyword.operator.spread.stm` | `...` |
| `keyword.other.stm` | Reserved keywords (`schema`, `fragment`, `mapping`, etc.) |
| `meta.arrow-body.stm` | Arrow transform body `{ ... }` |
| `meta.block.fragment.stm` | Fragment block |
| `meta.block.list.stm` | List block |
| `meta.block.map.stm` | Map block |
| `meta.block.mapping.stm` | Mapping block |
| `meta.block.note.stm` | Note block |
| `meta.block.record.stm` | Record block |
| `meta.block.schema.stm` | Schema block |
| `meta.block.transform.stm` | Transform block |
| `meta.import.stm` | Import statement |
| `meta.metadata.stm` | Metadata `()` blocks |
| `punctuation.definition.array.stm` | `[]` array indicators |
| `punctuation.definition.identifier.begin.stm` | Opening `` ` `` |
| `punctuation.definition.identifier.end.stm` | Closing `` ` `` |
| `punctuation.definition.parameters.stm` | `()` around type parameters |
| `punctuation.definition.string.begin.stm` | Opening `"`, `"""`, `'` |
| `punctuation.definition.string.end.stm` | Closing `"`, `"""`, `'` |
| `punctuation.section.block.begin.stm` | `{` |
| `punctuation.section.block.end.stm` | `}` |
| `punctuation.section.parens.begin.stm` | `(` |
| `punctuation.section.parens.end.stm` | `)` |
| `punctuation.separator.comma.stm` | `,` |
| `punctuation.separator.key-value.stm` | `:` in map entries |
| `string.quoted.double.stm` | Double-quoted string content |
| `string.quoted.single.stm` | Single-quoted block label content |
| `string.quoted.triple.stm` | Triple-double-quoted string content |
| `support.function.stm` | Known pipeline operation tokens |
| `support.other.stm` | Vocabulary tokens (constraints, format, domain) |
| `support.type.stm` | Data type names (`VARCHAR`, `INT`, `UUID`, etc.) |
| `variable.other.field.stm` | Field names, dotted paths, relative paths |
