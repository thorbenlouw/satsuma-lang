---
id: stm-55vc
status: open
deps: [stm-o50b, stm-2m6y]
links: []
created: 2026-03-16T13:46:39Z
type: task
priority: 1
assignee: Thorben Louw
parent: stm-t1n8
---
# Implement baseline TextMate grammar for STM declarations and literals

Implement the first usable STM TextMate grammar covering top-level declarations, literals, identifiers, comments, operators, tags, annotations, and multiline note blocks with theme-compatible scopes. The grammar goes into the scaffold created by stm-2m6y.

## Design Notes

Reference: [HIGHLIGHTING-TAXONOMY.md §1–§4](features/03-vscode-syntax-highlighter/HIGHLIGHTING-TAXONOMY.md)

### Keyword scopes (taxonomy §2.1)

| STM keywords | TextMate scope |
|---|---|
| `integration`, `source`, `target`, `table`, `message`, `record`, `event`, `schema`, `lookup`, `fragment`, `map`, `namespace`, `workspace`, `note` | `keyword.other.stm` |
| `import`, `from`, `as` | `keyword.control.import.stm` |
| `when`, `else`, `fallback` | `keyword.control.conditional.stm` |
| `in` | `keyword.operator.stm` |

All schema-block keywords are synonymns — use a single scope (`keyword.other.stm`).

### Literal scopes (taxonomy §2.2)

| Construct | Scope |
|---|---|
| `"..."` | `string.quoted.double.stm` |
| `'''...'''` | `string.quoted.other.multiline.stm` |
| Numbers | `constant.numeric.stm` |
| `true` / `false` | `constant.language.boolean.stm` |
| `null` | `constant.language.null.stm` |

### Comment scopes (taxonomy §2.3)

| Prefix | Scope |
|---|---|
| `//` | `comment.line.double-slash.stm` |
| `//!` | `comment.line.double-slash.warning.stm` |
| `//?` | `comment.line.double-slash.question.stm` |

The `.warning` and `.question` suffixes fall back to plain comment colour in generic themes — this is acceptable.

### Identifier scopes (taxonomy §2.4)

| Position | Scope |
|---|---|
| Field name (default) | `variable.other.field.stm` |
| Backtick-quoted identifier | `variable.other.quoted.stm` |
| Type name in type expression | `support.type.stm` |
| Schema/block name in header | `entity.name.type.stm` |
| Integration name | `entity.name.section.stm` |
| Fragment name after `...` | `entity.name.type.stm` |
| Standard reference (`E.164`) | `constant.other.reference.stm` |

Function names in transforms are **semantic-only** — TextMate should only scope `identifier(` patterns as `entity.name.function.stm` (§3.5). Bare pipeline identifiers stay `variable.other.field.stm`.

### Annotation scopes (taxonomy §2.5)

- `@` sigil: `punctuation.definition.annotation.stm`
- Annotation name: `entity.name.decorator.stm`
- Annotation arguments: inherit from their literal/identifier scopes
- `key = value` form: key → `variable.parameter.stm`, value → string/literal scope

### Tag scopes (taxonomy §2.6)

- `[` / `]` (tag list delimiters): `punctuation.definition.tag.stm`
- Tag name (`pk`, `required`, etc.): `entity.name.tag.stm`
- Tag value separator `:`: `punctuation.separator.tag.stm`
- Tag values inherit from literal/identifier scopes

### Operator and punctuation scopes (taxonomy §2.7)

| Symbol | Scope |
|---|---|
| `->` | `keyword.operator.arrow.stm` |
| `=>` | `keyword.operator.fat-arrow.stm` |
| `::` | `punctuation.separator.namespace.stm` |
| `:` (transform separator) | `keyword.operator.transform.stm` |
| `.` (path separator) | `punctuation.separator.accessor.stm` |
| `\|` (pipe) | `keyword.operator.pipe.stm` |
| `...` (spread) | `keyword.operator.spread.stm` |
| `=` (annotation assignment) | `keyword.operator.assignment.stm` |
| `==` `!=` `<` `>` `<=` `>=` | `keyword.operator.comparison.stm` |
| `+` `-` `*` `/` | `keyword.operator.arithmetic.stm` |
| `_` (wildcard) | `constant.language.wildcard.stm` |
| `{` / `}` | `punctuation.section.block.stm` |
| `(` / `)` | `punctuation.section.parens.stm` |
| `[` / `]` (array marker, not tag) | `punctuation.definition.array.stm` |
| `,` | `punctuation.separator.comma.stm` |

### Note block strategy (taxonomy §2.8)

Scope `note '''...'''` as documentation with string body:
- `note` keyword: `keyword.other.stm`
- `'''` delimiters: `punctuation.definition.string.begin.stm` / `punctuation.definition.string.end.stm`
- Body content: `string.quoted.other.multiline.stm`
- Outer scope: `comment.block.documentation.stm`

### Description strings (taxonomy §2.9)

Strings in the second token position of a schema block header (the description) get `string.quoted.double.stm` with additional parent context `comment.block.documentation.stm`.

### Soft keyword handling (taxonomy §3.4)

`namespace` and `workspace` are soft keywords. Match them as keywords only in declaration-head position (beginning of line or block context). Do not globally match them as keywords — they are valid as field names.

### `map` keyword disambiguation (taxonomy §3.6)

`map` at top level or after specified keywords is a declaration keyword. `map` preceded by `:` or `|` inside a map body is a value-map literal keyword. Use parent context to distinguish. Accept minor overlap.

### Tree-sitter correspondence (taxonomy §4.1)

The TextMate scopes above align with Tree-sitter captures in `highlights.scm`. Reference the full table in taxonomy §4.1 during implementation to keep parity.

### Fixture files for this phase

From taxonomy §5.2, this task should add scope assertion fixtures for:
- `test/fixtures/declarations.stm` — schema/integration/fragment/map block headers
- `test/fixtures/fields.stm` — field declarations with types, tags, annotations
- `test/fixtures/tags.stm` — tag lists, enum values, edge cases
- `test/fixtures/annotations.stm` — all annotation forms
- `test/fixtures/comments.stm` — `//`, `//!`, `//?` forms
- `test/fixtures/notes.stm` — `note '''...'''` blocks, inline note blocks
- `test/fixtures/literals.stm` — strings, numbers, booleans, null
- `test/fixtures/operators.stm` — `->`, `=>`, `::`, `|`, comparisons, arithmetic

## Acceptance Criteria

- The TextMate grammar (`syntaxes/stm.tmLanguage.json`) scopes all declaration keywords with `keyword.other.stm` or `keyword.control.*.stm` as specified in the taxonomy §2.1.
- Import keywords (`import`, `from`, `as`) use `keyword.control.import.stm`.
- All three comment forms (`//`, `//!`, `//?`) receive distinct scopes that fall back gracefully in generic themes.
- Strings, numbers, booleans, and null receive the literal scopes from taxonomy §2.2.
- Identifiers in field-name, type-name, schema-name, and backtick positions receive correct scopes per taxonomy §2.4.
- Tags receive `entity.name.tag.stm` and annotations receive `entity.name.decorator.stm` per taxonomy §2.5–§2.6.
- All operators and punctuation receive the scopes from taxonomy §2.7.
- Note blocks use the documentation + string body strategy from taxonomy §2.8.
- Soft keywords (`namespace`, `workspace`) are scoped as keywords only in declaration-head position per taxonomy §3.4.
- `identifier(` patterns may be scoped as function calls; bare pipeline identifiers are not (taxonomy §3.5).
- Fixture files listed above exist with inline scope assertions and pass via `vscode-tmgrammar-test`.
- The grammar remains readable and avoids brittle deeply nested regexes.
