# PRD: VS Code Syntax Highlighter for STM v2

> **Status: COMPLETED** (2026-03-18). TextMate grammar rewritten for v2 syntax. All fixture tests and golden tests pass against canonical examples.

## Feature: `07-vscode-syntax-highlighter-v2`

---

## 1. Problem Statement

The existing VS Code syntax highlighter (feature 03) targets STM v1 syntax. STM v2 introduces significant language changes — a unified `schema` keyword, `()` metadata instead of `[]` tags, `record`/`list` for nesting, `map {}` blocks, `"""` triple-quoted strings, `transform` blocks, and the removal of `@annotation` syntax. The current TextMate grammar does not cover these constructs and will mis-highlight v2 files.

We need a v2-aligned TextMate grammar that replaces the v1 grammar and correctly highlights all constructs defined in `STM-V2-SPEC.md`.

---

## 2. Goals

1. Ship an updated VS Code extension that correctly highlights `.stm` files written in STM v2 syntax.
2. Cover all reserved keywords, vocabulary tokens, operators, comment forms, string forms, and structural patterns from the v2 spec.
3. Maintain standard TextMate scope names for theme compatibility across Dark+, Light+, and popular community themes.
4. Reuse the existing `tooling/vscode-stm/` extension structure — this is an update, not a separate extension.
5. Leave a clear path for semantic tokens once a parser/LSP exists.

---

## 3. Non-Goals

- LSP features (completion, hover, go-to-definition, rename, diagnostics).
- Semantic validation of schema references, mapping correctness, or type checking.
- Embedding a Tree-sitter parser into the extension.
- Supporting STM v1 syntax — the grammar targets v2 only.

---

## 4. v2 Syntax Delta from v1

These are the changes that directly affect the TextMate grammar:

| Area | v1 | v2 | Grammar Impact |
|------|----|----|----------------|
| Schema declaration | `table`, `message`, `source`, `target` | Single `schema` keyword | Replace keyword list |
| Nesting | `STRUCT {}`, `ARRAY {}` | `record Name {}`, `list Name {}` | New keyword patterns |
| Metadata | `[pk, required]` | `(pk, required)` | Switch delimiter scoping |
| Annotations | `@xpath(...)`, `@format(...)` | `(xpath ..., format ...)` inside `()` | Remove `@` patterns, add vocab tokens in `()` |
| Enum syntax | `[enum: {a, b}]` | `(enum {a, b})` | Adjust enum pattern context |
| Notes | `note '''...'''` triple-single-quoted | `(note "...")` or `note { """...""" }` | Triple-double-quote support, `note {}` blocks |
| Computed fields | `=> target` | `-> target` (no left side) | Remove `=>` operator, allow bare `->` |
| Conditionals | `when/else/fallback` | `map {}` with conditions | New `map` keyword, remove flow keywords |
| Transforms | Inline `: transform` | `{ transform }` after arrow, `transform` blocks | New `transform` keyword, `{}` body |
| Fragments | Same `fragment` keyword | Same + `...spread` syntax | Add spread operator `...` |
| Imports | Similar | `import { names } from "path"` | Add `from` keyword |
| Integration block | `integration {}` | `note { """...""" }` | Remove `integration` keyword |
| Strings | `"double"`, `'''triple-single'''` | `"double"`, `"""triple-double"""`, `` `backtick` ``, `'block-label'` | New string patterns |

---

## 5. v2 Token Inventory

### 5.1 Reserved Keywords (introduce structural blocks)

`schema` `fragment` `mapping` `transform` `source` `target` `map` `record` `list` `note` `import` `from`

### 5.2 Vocabulary Tokens (context-dependent, not reserved)

**Constraints:** `pk`, `required`, `unique`, `indexed`, `pii`, `encrypt`
**Types/formats:** `enum`, `default`, `format`, `ref`
**Operations:** `filter`, `join`, `flatten`, `coalesce`, `trim`, `lowercase`, `uppercase`, `round`, `split`, `first`, `last`, `to_utc`, `to_iso8601`, `parse`, `null_if_empty`, `null_if_invalid`, `validate_email`, `now_utc`, `title_case`, `escape_html`, `truncate`, `to_number`, `prepend`, `max_length`
**Domain:** `xpath`, `namespace`, `datavault`, `scd`, `hub`, `satellite`, `hashkey`, `watermark`, `late_arrival`, `dedup`, `classification`, `retention`, `lineage`

Vocabulary tokens are open-ended — the grammar should highlight known tokens but not break on unknown ones.

### 5.3 Operators

| Operator | Scope |
|----------|-------|
| `->` | `keyword.operator.arrow.stm` |
| `\|` | `keyword.operator.pipe.stm` |
| `...` | `keyword.operator.spread.stm` |
| `:` | `punctuation.separator.key-value.stm` |
| `.` | `punctuation.separator.accessor.stm` |
| `[]` | `punctuation.definition.array.stm` |

### 5.4 Comments

| Syntax | Scope |
|--------|-------|
| `//` | `comment.line.double-slash.stm` |
| `//!` | `comment.line.double-slash.warning.stm` |
| `//?` | `comment.line.double-slash.question.stm` |

### 5.5 Strings

| Form | Scope |
|------|-------|
| `"double quoted"` | `string.quoted.double.stm` |
| `"""triple quoted"""` | `string.quoted.triple.stm` |
| `` `backtick` `` | `entity.name.tag.stm` (identifier reference) |
| `'block label'` | `string.quoted.single.stm` (block names only) |

### 5.6 Literals

| Form | Scope |
|------|-------|
| Numbers (integers, decimals) | `constant.numeric.stm` |
| `null` | `constant.language.null.stm` |
| `default` (in map catch-all) | `keyword.control.default.stm` |
| `_` (wildcard default) | `keyword.control.default.stm` |

---

## 6. Functional Requirements

### 6.1 Language Registration

Same as feature 03 — `.stm` files, language id `stm`, line comment `//`, bracket pairs `{}`, `[]`, `()`.

### 6.2 TextMate Grammar Coverage

The grammar must correctly scope:

1. **Keywords:** All reserved keywords in their declaration context.
2. **Block labels:** Bare identifiers and single-quoted names after keywords.
3. **Field declarations:** `name type (metadata)` pattern inside schema/fragment/record/list.
4. **Vocabulary tokens:** Known constraint/format/operation/domain tokens in `()` metadata and `{}` pipeline bodies.
5. **Comments:** All three comment forms with distinct scopes.
6. **Strings:** All four string forms (`"`, `"""`, `` ` ``, `'`).
7. **Operators:** Arrow, pipe, spread, colon, dot, array brackets.
8. **Mapping arrows:** `source -> target { transform }` and computed `-> target { transform }`.
9. **Map blocks:** `map { key: value }` discrete value mappings.
10. **Note blocks:** `note { "..." }` and `note { """...""" }`.
11. **Import statements:** `import { names } from "path"`.
12. **Type names:** Common data types (VARCHAR, INT, UUID, etc.) in field declarations.
13. **Nested structures:** `record name {}` and `list name {}` at any depth.
14. **Spread syntax:** `...fragment name` in schema bodies and `...transform name` in pipelines.
15. **Pipeline functions:** `trim | lowercase | validate_email` — function-like tokens with optional `(args)`.

### 6.3 Theme Compatibility

Standard TextMate scope names only. Must look reasonable in Dark+, Light+, One Dark Pro, Solarized.

### 6.4 Graceful Degradation

Malformed/in-progress files must not cause catastrophic over-scoping (e.g., an unterminated `"""` painting the rest of the file as a string).

---

## 7. Deliverables

### D1: Updated TextMate grammar

`tooling/vscode-stm/syntaxes/stm.tmLanguage.json` — rewritten for v2 syntax.

### D2: Updated language configuration

`tooling/vscode-stm/language-configuration.json` — review for v2 changes (auto-closing `"""`, etc.).

### D3: Test fixtures

Fixture files covering all v2 constructs with scope assertions using `vscode-tmgrammar-test`.

### D4: v2 Highlighting taxonomy

`features/07-vscode-syntax-highlighter-v2/HIGHLIGHTING-TAXONOMY.md` — canonical token-to-scope mapping for v2.

---

## 8. Implementation Strategy

### Phase 1: Taxonomy and Test Plan

- Finalize v2 token-to-scope mapping
- Write test fixture files from v2 spec examples
- Define expected scopes for each fixture

### Phase 2: Grammar Rewrite

- Strip v1-only patterns (integration, =>, @annotations, bracket tags, triple-single-quotes)
- Add v2 patterns: schema/record/list/transform/map keywords, triple-double-quotes, spread, import/from, note blocks, vocabulary tokens
- Implement in layers: keywords → strings/comments → operators → field declarations → mapping bodies → map blocks → edge cases

### Phase 3: Validation

- Run `vscode-tmgrammar-test` against all fixtures
- Test against all `examples-v2/` files
- Visual inspection in Dark+ and Light+ themes
- Test malformed files for graceful degradation

### Phase 4: Documentation

- Update extension README
- Write highlighting taxonomy doc
- Document known approximation limits

---

## 9. Risks

### 9.1 Vocabulary token explosion

v2's open vocabulary means the grammar can't enumerate every valid token. Strategy: highlight known tokens; unknown tokens get default identifier scoping.

### 9.2 `"""` termination

Triple-double-quote blocks could cause runaway string scoping if unterminated. The begin/end pattern must be robust.

### 9.3 Context-sensitive constructs

Some constructs (e.g., `source`/`target` as keywords vs. field names, `map` as keyword vs. identifier) are context-sensitive. TextMate can only approximate — document these as semantic token candidates.

---

## 10. Acceptance Criteria

- [ ] `.stm` files open in VS Code with correct v2 syntax highlighting
- [ ] All reserved keywords highlighted as keywords
- [ ] All four string forms highlighted distinctly
- [ ] All three comment forms highlighted with distinct scopes
- [ ] `->`, `|`, `...` operators highlighted
- [ ] `map {}` blocks highlight keys and values
- [ ] `record` and `list` nested structures highlighted
- [ ] `import { } from ""` statements highlighted
- [ ] `note { """...""" }` blocks highlighted with Markdown-aware string scoping
- [ ] Known vocabulary tokens highlighted in metadata `()` and pipeline `{}` contexts
- [ ] Fixture tests pass via `vscode-tmgrammar-test`
- [ ] All `examples-v2/` files render correctly
- [ ] Unterminated strings/blocks degrade gracefully
