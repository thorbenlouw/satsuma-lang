# STM Highlighting Taxonomy

Shared syntax inventory, TextMate scope mapping, parser-sharing contract, and test
strategy for the VS Code STM extension.

**Status**: Authoritative reference for all downstream grammar and extension work.
Derived from [STM-SPEC.md](/STM-SPEC.md) v1.0.0, canonical [examples/](/examples),
and the Tree-sitter grammar at [tooling/tree-sitter-stm/grammar.js](/tooling/tree-sitter-stm/grammar.js).

---

## 1. STM Syntax Inventory

Every syntactic construct that a highlighter must recognise, grouped by category.

### 1.1 Declaration Keywords

These keywords introduce top-level or nested blocks. All are reserved
(Section 3.4 of the spec) except where noted.

| Keyword | Context | Spec Section |
|---------|---------|-------------|
| `integration` | Top-level metadata block | §5 |
| `source` | Schema block (source role) | §6.1 |
| `target` | Schema block (target role) | §6.1 |
| `table` | Schema block (database table) | §6.1 |
| `message` | Schema block (EDI/event) | §6.1 |
| `record` | Schema block (flat file) | §6.1 |
| `event` | Schema block (domain event) | §6.1 |
| `schema` | Schema block (generic), also used in workspace entries | §6.1, §4.7 |
| `lookup` | Schema block (reference data) | §6.1 |
| `fragment` | Reusable partial schema | §7 |
| `map` | Mapping block, also used for inline value-map literals | §8.1, §8.4 |
| `import` | Import declaration | §4 |
| `namespace` | Soft keyword — namespace declaration | §4.5 |
| `workspace` | Soft keyword — workspace block | §4.7 |

### 1.2 Flow / Transform Keywords

These keywords appear inside map bodies as transform control flow.

| Keyword | Context | Spec Section |
|---------|---------|-------------|
| `when` | Conditional branch head | §8.4 |
| `else` | Else branch | §8.4 |
| `fallback` | Alternate source path | §8.4 |
| `from` | Import path / workspace entry | §4.2, §4.7 |
| `as` | Import alias | §4.3 |
| `note` | Note block introducer | §3.5 / §5.2 |
| `true` | Boolean literal (also reserved) | §3.4 |
| `false` | Boolean literal (also reserved) | §3.4 |
| `null` | Null literal (also reserved) | §3.4 |
| `in` | Conditional `when X in (...)` | §8.4 |

### 1.3 Literals

| Form | Example | Parser Node |
|------|---------|-------------|
| Double-quoted string | `"hello"` | `string_literal` |
| Triple-quoted multiline string | `'''...'''` | `multiline_string` |
| Integer | `42`, `-1` | `number_literal` |
| Decimal | `3.14`, `-0.5` | `number_literal` |
| Boolean | `true`, `false` | `boolean_literal` |
| Null | `null` | `null_literal` |

### 1.4 Comments

| Prefix | Semantic Weight | Parser Node |
|--------|----------------|-------------|
| `//` | Informational (neutral) | `info_comment` |
| `//!` | Warning (risk/issue) | `warning_comment` |
| `//?` | Question/TODO (open item) | `question_comment` |

Comments extend to end of line. All three forms may appear standalone or at end of a statement line.

### 1.5 Identifiers

| Form | Example | Parser Node |
|------|---------|-------------|
| Unquoted identifier | `customer_id`, `CUST_TYPE` | `identifier` |
| Backtick-quoted identifier | `` `Lead_Source_Detail__c` `` | `quoted_identifier` |
| Standard reference | `E.164`, `ISO-8601` | `standard_ref` |

### 1.6 Operators and Delimiters

| Symbol | Name | Parser Node | Usage |
|--------|------|-------------|-------|
| `->` | Arrow | `arrow` | Direct mapping: source → target |
| `=>` | Fat arrow | `fat_arrow` | Computed mapping, when/else value separator |
| `:` | Colon | `symbol` | Transform separator, tag value separator |
| `::` | Namespace separator | `namespace_separator` | `ns::schema.field` |
| `.` | Dot | `symbol` | Path segment separator |
| `\|` | Pipe | `operator` | Pipeline continuation |
| `@` | At sign | (punctuation) | Annotation prefix |
| `...` | Ellipsis | `ellipsis` | Fragment spread |
| `[]` | Array marker | (punctuation) | Array group/field suffix |
| `{}` | Braces | (punctuation) | Block delimiters, enum sets, value-map literals |
| `()` | Parentheses | (punctuation) | Type params, annotation args, function calls |
| `,` | Comma | `symbol` | List separator |
| `=` | Equals | (punctuation) | Annotation key=value (`@ns ord = "..."`) |
| `+` `-` `*` `/` `\` | Arithmetic | `operator` | Inline arithmetic in transforms |
| `==` `!=` `<` `>` `<=` `>=` | Comparison | `comparison_operator` | Filter/when conditions |
| `_` | Wildcard | `wildcard` | Catch-all key in value-map literals |

### 1.7 Annotations

Annotations are postfix metadata markers. Syntax: `@name(args)` or `@name key = "value"`.

| Annotation | Context | Spec Section |
|------------|---------|-------------|
| `@format(...)` | Schema block — physical format | §6.5 |
| `@pos(offset, length)` | Field — fixed-length position | §6.5 |
| `@xpath("...")` | Field/group — XML extraction | §6.5 |
| `@ns name = "uri"` | Schema block — XML namespace | §6.5 |
| `@header("...")` | Field — CSV column header | §6.5 |
| `@filter(condition)` | Group — array filter | §6.5 |
| `@path("...")` | Field/group — generic extraction path | §6.5 |
| `@on_error(action)` | Map block — failure handling | §8.4 |
| `@reject_target(name)` | Map block — rejection target | §8.4 |
| `@error_threshold(pct)` | Map block — error threshold | §8.4 |

### 1.8 Tags

Tags appear in square-bracket lists after field type expressions.

| Tag | Has Value | Value Form |
|-----|-----------|-----------|
| `pk` | No | — |
| `required` | No | — |
| `unique` | No | — |
| `indexed` | No | — |
| `pii` | No | — |
| `encrypt` | Optional | Identifier or string (`AES-256-GCM`) |
| `default` | Yes | Literal or identifier |
| `enum` | Yes | Braced set: `{a, b, "c"}` |
| `format` | Yes | Identifier or standard_ref (`E.164`) |
| `min` / `max` | Yes | Number |
| `pattern` | Yes | String |
| `ref` | Yes | Dotted path (`table.field`) |
| `note` | Yes | String |
| Custom tags | Optional | Any tag value form |

### 1.9 Structural Constructs

| Construct | Description |
|-----------|-------------|
| Schema body `{ ... }` | Contains fields, groups, notes, spreads, comments |
| Group declaration | Nested object: `name { fields }` |
| Array group | `name[] { fields }` |
| Field declaration | `name TYPE [tags] @annotations` |
| Fragment spread | `...fragment_name` |
| Map body `{ ... }` | Contains map entries, nested maps, transforms, notes, comments |
| Integration body `{ ... }` | Contains key-value fields, notes, comments |
| Workspace body `{ ... }` | Contains `schema ... from ...` entries, notes |
| Note block | `note '''...'''` |
| Inline note block | `{ note '''...''' }` — attached to a field or map entry |
| Value-map literal | `map { key: value, ... }` — inline lookup table |

---

## 2. Token Taxonomy — TextMate Scope Mapping

Maps each STM construct to a standard TextMate scope. Scopes are chosen for
compatibility with popular VS Code themes (Dark+, One Dark, Solarized, Monokai,
GitHub, Catppuccin).

### 2.1 Keywords

| STM Construct | TextMate Scope | Notes |
|---------------|---------------|-------|
| Declaration keywords (`integration`, `source`, `target`, `table`, `message`, `record`, `event`, `schema`, `lookup`, `fragment`, `map`) | `keyword.other.stm` | All schema-block keywords are synonyms; use a single scope |
| `import` | `keyword.control.import.stm` | Matches standard import colouring |
| `from` | `keyword.control.import.stm` | Part of import/workspace syntax |
| `as` | `keyword.control.import.stm` | Import alias |
| `namespace` | `keyword.other.stm` | Soft keyword, same as declaration keywords |
| `workspace` | `keyword.other.stm` | Soft keyword |
| `when` | `keyword.control.conditional.stm` | Transform flow |
| `else` | `keyword.control.conditional.stm` | Transform flow |
| `fallback` | `keyword.control.conditional.stm` | Transform flow |
| `note` | `keyword.other.stm` | Note block introducer |
| `in` | `keyword.operator.stm` | Condition operator |

### 2.2 Literals

| STM Construct | TextMate Scope |
|---------------|---------------|
| Double-quoted string (`"..."`) | `string.quoted.double.stm` |
| Triple-quoted multiline string (`'''...'''`) | `string.quoted.other.multiline.stm` |
| String inside note block | `string.quoted.other.multiline.stm` (parent: `comment.block.documentation.stm`) |
| Number literal | `constant.numeric.stm` |
| `true` / `false` | `constant.language.boolean.stm` |
| `null` | `constant.language.null.stm` |

### 2.3 Comments

| STM Construct | TextMate Scope |
|---------------|---------------|
| `//` info comment | `comment.line.double-slash.stm` |
| `//!` warning comment | `comment.line.double-slash.warning.stm` |
| `//?` question comment | `comment.line.double-slash.question.stm` |

Theme compatibility note: Most themes only distinguish `comment` from non-comment.
The `.warning` and `.question` suffixes enable custom theming rules but will
fall back to plain comment colouring in generic themes. This matches the
Tree-sitter highlights.scm convention where `warning_comment` maps to
`@comment.error` and `question_comment` maps to `@comment.warning`.

### 2.4 Identifiers

| STM Construct | TextMate Scope | Notes |
|---------------|---------------|-------|
| Identifier in field declaration (name position) | `variable.other.field.stm` | Default for unresolved identifiers |
| Backtick-quoted identifier | `variable.other.quoted.stm` | Includes backtick delimiters |
| Type name (in type expression) | `support.type.stm` | e.g. `VARCHAR`, `INT`, `UUID` |
| Schema/block name (in declaration header) | `entity.name.type.stm` | After `source`, `target`, etc. |
| Integration name | `entity.name.section.stm` | After `integration` |
| Map option name | `variable.parameter.stm` | e.g. `flatten`, `group_by`, `when` in options |
| Function name (in transforms) | `entity.name.function.stm` | **Semantic-only** — TextMate cannot reliably separate function calls from bare identifiers in transforms |
| Fragment name (in spread) | `entity.name.type.stm` | After `...` |
| Standard reference | `constant.other.reference.stm` | `E.164`, `ISO-8601` |

### 2.5 Annotations

| STM Construct | TextMate Scope |
|---------------|---------------|
| `@` sigil | `punctuation.definition.annotation.stm` |
| Annotation name | `entity.name.decorator.stm` (`storage.type.annotation.stm` also acceptable) |
| Annotation arguments | Inherit from their literal or identifier scopes |
| Annotation `key = value` form | Key: `variable.parameter.stm`, value: `string.quoted.double.stm` |

### 2.6 Tags

| STM Construct | TextMate Scope |
|---------------|---------------|
| `[` / `]` (tag list delimiters) | `punctuation.definition.tag.stm` |
| Tag name (e.g. `pk`, `required`) | `entity.name.tag.stm` |
| Tag value separator `:` | `punctuation.separator.tag.stm` |
| Tag value — inherits from literal/identifier scopes | (respective literal scope) |
| Enum value set `{ ... }` | Values inherit literal/identifier scopes |

### 2.7 Operators and Punctuation

| STM Construct | TextMate Scope |
|---------------|---------------|
| `->` | `keyword.operator.arrow.stm` |
| `=>` | `keyword.operator.fat-arrow.stm` |
| `::` | `punctuation.separator.namespace.stm` |
| `:` (transform separator) | `keyword.operator.transform.stm` |
| `.` (path separator) | `punctuation.separator.accessor.stm` |
| `\|` (pipe) | `keyword.operator.pipe.stm` |
| `...` (spread) | `keyword.operator.spread.stm` |
| `=` (annotation assignment) | `keyword.operator.assignment.stm` |
| `==`, `!=`, `<`, `>`, `<=`, `>=` | `keyword.operator.comparison.stm` |
| `+`, `-`, `*`, `/` | `keyword.operator.arithmetic.stm` |
| `_` (wildcard) | `constant.language.wildcard.stm` |
| `{` / `}` | `punctuation.section.block.stm` |
| `(` / `)` | `punctuation.section.parens.stm` |
| `[` / `]` (non-tag, e.g. array marker) | `punctuation.definition.array.stm` |
| `,` | `punctuation.separator.comma.stm` |

### 2.8 Note Blocks

| STM Construct | TextMate Scope |
|---------------|---------------|
| `note` keyword | `keyword.other.stm` |
| `'''` (opening/closing delimiters) | `punctuation.definition.string.begin.stm` / `punctuation.definition.string.end.stm` |
| Note body content | `string.quoted.other.multiline.stm` |
| Entire note block (outer scope) | `comment.block.documentation.stm` |

Strategy: Scope the `note '''...'''` block as documentation (`comment.block.documentation`) so it appears visually distinct from code, while the body content gets string scoping for themes that colour inside documentation blocks.

### 2.9 Description Strings

Strings that appear as the second token in a schema block header (the description position) should receive `string.quoted.double.stm` with an additional context scope `comment.block.documentation.stm` when the parent is a schema declaration. This mirrors how the Tree-sitter query assigns `@string.documentation` to these positions.

---

## 3. Ambiguous Constructs — TextMate Approximation Limits

These constructs cannot be precisely classified by regex-based TextMate grammars.
The TextMate grammar should highlight them consistently but approximately, with
finer distinctions deferred to semantic tokens.

### 3.1 Source vs. Target Paths in Map Bodies

**Problem**: In `source_field -> target_field`, the left-hand side is a source reference
and the right-hand side is a target reference. TextMate cannot determine which side of
`->` an identifier falls on without structural parsing.

**TextMate approach**: Colour both sides identically as `variable.other.field.stm`. Do
not attempt left/right role colouring.

**Semantic token opportunity**: `stm.source` vs `stm.target` custom semantic types,
assigned by parsing the map entry structure.

### 3.2 Schema ID vs. Field ID in Dotted Paths

**Problem**: In `sfdc_account.BillingCountry`, `sfdc_account` is a schema reference
and `BillingCountry` is a field. In `address.line1`, `address` might be a group name.
TextMate cannot distinguish these roles.

**TextMate approach**: Colour the entire dotted path uniformly. Do not attempt to
split the first segment into a different scope.

**Semantic token opportunity**: Parser-backed resolution of path segment roles using
schema definitions in scope.

### 3.3 Namespace Qualifier vs. Identifier

**Problem**: In `crm::orders.order_id`, `crm` is a namespace. In transforms, bare
identifiers like `crm` could be field names. TextMate can match `::` as a delimiter
but cannot verify the preceding token is actually a namespace.

**TextMate approach**: Colour the `::` delimiter and let the preceding identifier
take default identifier scope. If `identifier::` is matchable by regex, optionally
scope the namespace portion differently, but accept false positives.

**Semantic token opportunity**: Namespace resolution from import/workspace declarations.

### 3.4 Soft Keywords Used as Identifiers

**Problem**: `namespace` and `workspace` are soft keywords — they are only keyword-like
at the start of top-level declarations. As field names (`namespace VARCHAR(50)`), they
are plain identifiers.

**TextMate approach**: Match these words as keywords only in declaration-head position
using begin/end patterns anchored to start-of-line or block context. Do not globally
match them as keywords.

**Semantic token opportunity**: Full parser context distinguishes keyword from identifier
use.

### 3.5 Function Calls vs. Identifiers in Transforms

**Problem**: In transform expressions like `trim | lowercase | validate_email`,
`trim` is a function call, but it looks identical to a field identifier. In
`coalesce(0)`, the parentheses help, but bare function names in pipelines are
indistinguishable from identifiers.

**TextMate approach**: Identifiers followed by `(` may be scoped as function calls.
Bare identifiers in pipe chains remain `variable.other.field.stm`. Do not attempt to
maintain a function name list in the TextMate grammar.

**Semantic token opportunity**: Parser-backed transform analysis knows which
identifiers are in function-call position.

### 3.6 `map` Keyword in Value-Map Literals vs. Block Declarations

**Problem**: `map` can be both a top-level block keyword and an inline value-map
literal keyword (e.g. `map { R: "retail", ... }`). TextMate can only distinguish
these by context (top-level vs. inside a transform pipeline).

**TextMate approach**: Use the pattern's parent context: `map` at top level (or after
specified keywords) is a declaration keyword; `map` preceded by `:` or `|` inside a
map body is treated as a function/keyword in transform context. Accept minor overlap.

**Semantic token opportunity**: Parser distinguishes `map_block` from
`value_map_literal` structurally.

### 3.7 Inline Note Blocks on Map Entries

**Problem**: A map entry may end with `{ note '''...''' }`. TextMate must recognise this
as a note block rather than a nested map body. The trigger is `note '''` following `{`.

**TextMate approach**: Use a begin/end pattern for `note '''...'''` that activates inside
any brace block. The brace pair around it receives generic block scopes. Accept that the
outer `{}` might occasionally be mis-scoped.

### 3.8 `selection_criteria` Blocks

**Problem**: `selection_criteria '''...'''` inside schema blocks contains SQL or other
non-STM content. TextMate could scope this as a multiline string, but ideally it would
be scoped differently from note blocks.

**TextMate approach**: Treat as a multiline string (`string.quoted.other.multiline.stm`).
Do not attempt embedded SQL highlighting in the MVP.

---

## 4. Parser / Editor Token Mapping

This section documents the relationship between Tree-sitter parser node kinds
(from [grammar.js](/tooling/tree-sitter-stm/grammar.js)) and the TextMate scopes
defined above, and identifies where semantic tokens will add value.

### 4.1 Direct Correspondence Table

The tree-sitter [highlights.scm](/tooling/tree-sitter-stm/queries/highlights.scm)
already assigns highlight captures. This table bridges those to TextMate scopes for
alignment.

| Tree-sitter Node / Capture | highlights.scm Capture | TextMate Scope |
|-----------------------------|----------------------|---------------|
| keywords (`integration`, `source`, …) | `@keyword` | `keyword.other.stm` / `keyword.control.*.stm` |
| `string_literal` | `@string` | `string.quoted.double.stm` |
| `multiline_string` | `@string` | `string.quoted.other.multiline.stm` |
| `warning_comment` | `@comment.error` | `comment.line.double-slash.warning.stm` |
| `question_comment` | `@comment.warning` | `comment.line.double-slash.question.stm` |
| `info_comment` | `@comment` | `comment.line.double-slash.stm` |
| `identifier` | `@variable` | `variable.other.field.stm` |
| `quoted_identifier` | `@variable.special` | `variable.other.quoted.stm` |
| `type_expression` > `name:identifier` | `@type` | `support.type.stm` |
| `number_literal` | `@number` | `constant.numeric.stm` |
| `boolean_literal` | `@boolean` | `constant.language.boolean.stm` |
| `null_literal` | `@constant.builtin` | `constant.language.null.stm` |
| `annotation` > `name:identifier` | `@attribute` | `entity.name.decorator.stm` |
| `@` (literal) | `@punctuation.special` | `punctuation.definition.annotation.stm` |
| `arrow` (`->`) | `@operator` | `keyword.operator.arrow.stm` |
| `fat_arrow` (`=>`) | `@operator` | `keyword.operator.fat-arrow.stm` |
| `namespace_separator` (`::`) | `@punctuation.delimiter` | `punctuation.separator.namespace.stm` |
| `note_block` | `@comment.block` | `comment.block.documentation.stm` |
| `schema_block` > `string_literal` | `@string.documentation` | `string.quoted.double.stm` (in doc context) |
| `map_option` > `name:identifier` | `@property` | `variable.parameter.stm` |
| `tag` > `name:identifier` | `@property` | `entity.name.tag.stm` |

### 4.2 Intentional Divergences

The Tree-sitter grammar provides structural information that TextMate cannot:

| Feature | Tree-sitter Behaviour | TextMate Limitation |
|---------|----------------------|-------------------|
| `map_entry` source/target fields | Separate `source:` and `target:` field nodes | Flat regex — both sides get same scope |
| `value_map_literal` vs `map_block` | Distinct node types | Must rely on context patterns |
| `schema_keyword` role | Named field on `schema_block` | Keyword matched by regex regardless of position |
| `path_segment` inside `field_path` | Structured path with segments | Flat identifier + dot matching |
| `block_map_entry` vs `nested_map` | Distinct structural nodes | Both look like `tokens { ... }` |
| `transform_head`, `pipe_continuation`, `when_clause` etc. | Distinct continuation node types | Matched by leading token regex only |

### 4.3 Future Semantic Token Types

When parser-backed semantic highlighting is implemented, these custom semantic
token types should be registered:

| Semantic Token Type | Modifier(s) | Description |
|--------------------|-------------|-------------|
| `variable` | `source` | Source-side field reference in a map entry |
| `variable` | `target` | Target-side field reference in a map entry |
| `namespace` | — | Namespace qualifier before `::` |
| `type` | — | Schema name in declaration header or path |
| `function` | — | Transform function name in pipeline |
| `property` | `declaration` | Field name in schema body (declaration site) |
| `property` | `reference` | Field name in map body (usage site) |
| `variable` | `readonly` | Computed mapping target (no direct source) |
| `keyword` | `control` | Soft keyword in keyword position |

### 4.4 Shared Fixture Reuse Contract

Both the TextMate grammar tests and the Tree-sitter parser tests should validate
against the same canonical STM files:

| Source | TextMate Usage | Tree-sitter Usage |
|--------|---------------|-------------------|
| `examples/*.stm` | Golden fixture — must parse without major mis-scoping | Fixture tests via `test/fixtures/examples/*.json` |
| `test/fixtures/recovery/inputs/*.stm` | Degradation fixtures — verify acceptable fallback | Recovery corpus tests |
| Corpus tests in `test/corpus/*.txt` | Derive scope assertions for isolated constructs | Primary unit test suite |

New syntax patterns added to the STM spec should result in:
1. A new or updated `examples/*.stm` file
2. A new or updated Tree-sitter corpus test
3. A corresponding TextMate scope fixture or assertion

---

## 5. Highlighting Test Strategy

### 5.1 Chosen Harness: `vscode-tmgrammar-test`

The [`vscode-tmgrammar-test`](https://github.com/nicolo-ribaudo/vscode-tmgrammar-test)
package provides a non-interactive CLI for asserting TextMate scope assignments
against annotated fixture files. It:

- Runs without a VS Code instance (CI-friendly)
- Uses inline comment annotations to assert specific scopes per token
- Supports snapshot-style and assertion-style tests
- Is actively maintained and widely used by language extensions

Alternative considered: `vscode-tmgrammar-snap` (snapshot-only). Rejected because
assertion-style tests provide clearer failure messages and are easier to maintain
incrementally.

### 5.2 Fixture Layout

```
tooling/vscode-stm/
├── test/
│   ├── fixtures/
│   │   ├── declarations.stm      # schema/integration/fragment/map block headers
│   │   ├── fields.stm            # field declarations with types, tags, annotations
│   │   ├── tags.stm              # tag lists, enum values, edge cases
│   │   ├── annotations.stm       # all annotation forms
│   │   ├── comments.stm          # //, //!, //? forms
│   │   ├── notes.stm             # note '''...''' blocks, inline note blocks
│   │   ├── map-entries.stm       # direct, computed, nested, block map entries
│   │   ├── transforms.stm        # pipelines, when/else/fallback, value maps
│   │   ├── paths.stm             # dotted, relative, namespaced, array paths
│   │   ├── imports.stm           # import, from, as, namespace, workspace
│   │   ├── literals.stm          # strings, numbers, booleans, null
│   │   └── operators.stm         # ->, =>, ::, |, comparisons, arithmetic
│   ├── degradation/
│   │   ├── missing-brace.stm     # unclosed block
│   │   ├── unterminated-string.stm
│   │   ├── unterminated-note.stm
│   │   ├── incomplete-arrow.stm  # `field ->` with no target
│   │   ├── partial-transform.stm # `field -> target :` with no expression
│   │   └── broken-tag-list.stm   # `[pk, required` with no closing bracket
│   └── golden/                   # symlinks or copies of examples/*.stm
│       ├── common.stm
│       ├── db-to-db.stm
│       ├── edi-to-json.stm
│       ├── sfdc_to_snowflake.stm
│       ├── multi-source-hub.stm
│       ├── protobuf-to-parquet.stm
│       └── xml-to-parquet.stm
```

### 5.3 Test Execution

```bash
# From tooling/vscode-stm/
npx vscode-tmgrammar-test -s syntaxes/stm.tmLanguage.json -g test/fixtures/*.stm
npx vscode-tmgrammar-test -s syntaxes/stm.tmLanguage.json -g test/golden/*.stm
```

These commands must be non-interactive and exit non-zero on failure. CI should
run both focused fixtures and golden files.

### 5.4 Degradation Test Criteria

Malformed fixtures in `test/degradation/` must not:

1. Cause the tokeniser to enter an unrecoverable state (all subsequent tokens mis-scoped)
2. Scope more than 3 lines of correct syntax after the error as unexpected scopes
3. Produce dramatically different results for incomplete-but-valid editing states

These are checked manually during initial development and can later be automated
as snapshot tests where the snapshot is reviewed for acceptable degradation.

### 5.5 Theme Verification

Before release, manually verify highlighting in at least:

- **Dark+** (VS Code default dark)
- **Light+** (VS Code default light)
- **One Dark Pro** (popular community theme)

Check that: keywords are coloured distinctly from identifiers, strings are coloured,
comments are visually de-emphasised, and annotation/tag names are distinguishable.

---

## 6. Open Decisions for Downstream Tasks

| Decision | Recommendation | Decided By |
|----------|---------------|-----------|
| TextMate grammar authoring format | Author in JSON directly (`syntaxes/stm.tmLanguage.json`). YAML adds a build step without enough benefit for a grammar of this size. | stm-55vc |
| Whether to scope `note '''...'''` as documentation or string | Documentation (`comment.block.documentation`) with string body. See §2.8. | This document (decided) |
| Whether `//!` and `//?` get dedicated scopes | Yes — use suffix scopes that fall back gracefully. See §2.3. | This document (decided) |
| Whether to attempt function-name scoping in transforms | No — defer to semantic tokens. Only scope `identifier(` patterns. See §3.5. | This document (decided) |
| Embedded SQL/Markdown highlighting inside notes | Not in MVP. Treat as opaque string content. | stm-55vc |

---

## Revision History

| Date | Change |
|------|--------|
| 2026-03-16 | Initial version — syntax inventory, TextMate scope mapping, ambiguity list, parser/editor mapping, test strategy |
