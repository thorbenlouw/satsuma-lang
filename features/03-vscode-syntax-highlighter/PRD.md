# PRD: VS Code Syntax Highlighter for STM

## Feature: `03-vscode-syntax-highlighter`

---

## 1. Problem Statement

STM has a language spec and an in-progress Tree-sitter parser plan, but it does not yet have a usable VS Code editing experience. That leaves STM authors without immediate syntax colouring, comment classification, bracket matching, or a familiar language mode in the editor most users are likely to try first.

The project docs already position syntax highlighting as an editor-facing outcome of parser work, but current VS Code extension guidance does not use Tree-sitter as the built-in baseline tokenisation path. For VS Code, the supported path for syntax colouring is a TextMate grammar, optionally augmented later by semantic tokens from an extension or language server.

We need a feature plan that delivers a practical STM syntax highlighter for VS Code without forking STM syntax knowledge across unrelated implementations.

---

## 2. Goals

1. Ship a VS Code extension that recognises `.stm` files and provides high-quality baseline syntax highlighting.
2. Keep STM token names, scopes, and examples aligned with the Tree-sitter parser work so the editor layer does not invent a second language definition.
3. Leave a clear path for later semantic highlighting powered by parser-backed analysis.
4. Cover the current STM syntax described in [STM-SPEC.md](/Users/thorben/dev/personal/stm/STM-SPEC.md) and canonical examples under [examples/](/Users/thorben/dev/personal/stm/examples).

---

## 3. Non-Goals

- Full LSP features such as completion, hover, go-to-definition, or rename.
- Semantic validation of references, namespaces, or mapping correctness.
- Replacing the Tree-sitter parser as the source of truth for syntax structure.
- Shipping a custom VS Code editor runtime or relying on undocumented Tree-sitter integration in VS Code core.

---

## 4. Design Summary

### 4.1 Baseline highlighting mechanism

The MVP should use a VS Code language extension with:

- `package.json` language registration for `stm`
- a `language-configuration.json` for comments, brackets, auto-closing pairs, and surrounding pairs
- a TextMate grammar (`syntaxes/stm.tmLanguage.json` or YAML-authored equivalent) for baseline tokenisation and theming

This matches current official VS Code guidance for syntax highlighting.

### 4.2 Parser sharing strategy

The TextMate grammar should not become an independent syntax authority. This feature should depend on the parser work and reuse its outputs where practical:

- share the same fixture corpus and example files
- share the same token/category inventory where naming can be aligned
- derive highlight test cases from parser-covered syntax examples
- reserve parser-backed semantic tokens as a follow-on phase once CST/AST conventions are stable

The project should treat the Tree-sitter grammar as the structural source of truth and the TextMate grammar as a VS Code compatibility layer.

### 4.3 Semantic highlighting phase

After the parser is stable, a later phase may add semantic tokens through a VS Code extension host contribution or LSP server. That phase can colour STM constructs that TextMate cannot distinguish reliably from regex-style tokenisation alone, for example:

- source-side vs target-side paths inside `mapping` bodies
- schema identifiers vs field identifiers in ambiguous path segments
- namespace qualifiers introduced by future multi-schema support

Semantic tokens are additive. The extension must remain useful with TextMate-only highlighting.

---

## 5. Dependency Model

### 5.1 Hard dependency

This feature depends on [features/01-treesitter-parser/PRD.md](/Users/thorben/dev/personal/stm/features/01-treesitter-parser/PRD.md) for:

- stable syntax inventory
- shared examples and malformed fixtures
- CST/AST naming conventions that inform token taxonomy
- confidence that the editor grammar matches actual STM syntax

The parser does not need to be embedded into the first VS Code extension release, but the feature should not be developed in isolation from it.

### 5.2 Planned follow-on dependency

If [features/02-multi-schema/PRD.md](/Users/thorben/dev/personal/stm/features/02-multi-schema/PRD.md) lands before or during this work, the VS Code grammar must include:

- `namespace`
- `workspace`
- `from`
- `::` namespace-qualified paths

If `02-multi-schema` is not yet merged, those rules should be tracked as an explicit follow-up instead of silently omitted.

---

## 6. Functional Requirements

### 6.1 Language registration

The extension must:

- recognise `.stm` files
- expose language id `stm`
- provide line comment support for `//`
- configure bracket pairs for `{}`, `[]`, and `()`
- configure string pairs for `"..."` and note delimiters where practical

### 6.2 TextMate grammar coverage

The syntax highlighter must scope, at minimum:

- keywords such as `integration`, `schema`, `source`, `target`, `table`, `message`, `event`, `lookup`, `fragment`, `mapping`, `note`, `when`, `else`, and `fallback`
- strings
- numbers
- booleans and null-like literals if STM defines them
- comments including STM-specific prefixes `//`, `//!`, and `//?`
- annotations
- tags and tag keys
- block/type identifiers
- operators and delimiters such as `->`, `=>`, `:`, `.`, `[]`, `{}`, `|`, and `@`

Where TextMate cannot precisely distinguish semantic roles, it should still colour the syntax consistently and leave finer distinctions to later semantic tokens.

### 6.3 Theme compatibility

The grammar should use standard TextMate scope names so STM looks reasonable in common VS Code themes without requiring a custom theme.

### 6.4 Validation and fixture coverage

The extension must be tested against:

- canonical valid examples from `examples/`
- targeted STM fixtures for edge cases
- representative malformed/editing-state examples to ensure tokenisation degrades acceptably

---

## 7. Proposed Deliverables

### Deliverable 1: VS Code extension package

Suggested location:

- `tooling/vscode-stm/`

Suggested contents:

- `package.json`
- `language-configuration.json`
- `syntaxes/stm.tmLanguage.json` or source grammar plus generated JSON
- `README.md`
- minimal extension metadata for local install/testing

### Deliverable 2: Highlighting fixture suite

A test set proving the TextMate grammar scopes important STM constructs correctly. This can be implemented with snapshot tests, token scope assertions, or a documented fixture harness used by the extension ecosystem.

### Deliverable 3: Parser/editor token mapping note

A short design note documenting:

- how parser node kinds map to TextMate scopes where possible
- where TextMate is intentionally approximate
- which semantic distinctions are deferred to future semantic tokens

---

## 8. Implementation Strategy

### Phase 1: Scope inventory

Lock a language token inventory from the STM spec, examples, and parser PRD:

- keyword list
- comment forms
- literal forms
- annotation/tag syntax
- operator inventory
- ambiguous constructs that need approximation

Output:

- token taxonomy
- list of required TextMate scopes
- list of future semantic-token opportunities

### Phase 2: Extension skeleton

Create a minimal VS Code language extension with:

- language registration
- language configuration
- empty or narrow TextMate grammar wired into VS Code

The goal is early installability and a stable package boundary.

### Phase 3: TextMate grammar implementation

Add patterns for STM declarations, comments, paths, mapping syntax, tags, annotations, notes, and transform continuations.

Special care is required for:

- multiline `note '''...'''` blocks
- distinguishing keywords from identifiers where STM uses soft keywords
- transform continuations beginning with `|`, `when`, `else`, and `fallback`
- operators such as `->` and `=>`

### Phase 4: Fixture-driven validation

Run highlighting tests against canonical examples and smaller edge-case snippets. Any syntax pattern that requires parser support later should be documented explicitly instead of guessed.

### Phase 5: Parser-backed refinement plan

Document the follow-on semantic-highlighting phase, including which token distinctions should come from Tree-sitter-backed parsing or an LSP rather than from additional TextMate regex complexity.

---

## 9. Risks and Decisions

### 9.1 Tree-sitter is not the VS Code baseline highlighter

The implementation guide currently says syntax highlighting is "via tree-sitter grammar". That is directionally true for the broader tooling stack, but it is not the current official VS Code extension model for baseline syntax colouring. The PRD should treat this as a documentation mismatch and keep the parser as the shared syntax authority while using TextMate for actual VS Code tokenisation.

### 9.2 Regex-only highlighting has limits

STM mapping syntax is compact and context-sensitive. A TextMate grammar can provide strong baseline highlighting, but some distinctions will be approximate until parser-backed semantic tokens exist.

### 9.3 Duplicate syntax definitions can drift

The biggest maintenance risk is divergence between:

- the STM spec
- the Tree-sitter grammar
- the TextMate grammar

This feature should explicitly reuse parser fixtures and document a shared token inventory to reduce drift.

---

## 10. Acceptance Criteria

- [ ] `features/03-vscode-syntax-highlighter/PRD.md` approved with parser dependency called out explicitly
- [ ] `tooling/vscode-stm/` created with a valid VS Code language extension skeleton
- [ ] `.stm` files open in VS Code with STM language id and baseline syntax highlighting
- [ ] `language-configuration.json` supports comments, brackets, and auto-closing pairs appropriate for STM
- [ ] TextMate grammar covers all canonical constructs present in `examples/` and parser fixtures relevant to STM v1
- [ ] Highlighting tests or scope fixtures exist and run non-interactively
- [ ] Parser/editor token mapping note documents what is shared with Tree-sitter and what is deferred to semantic tokens
- [ ] Any unsupported syntax or approximate highlighting cases are documented near the grammar/tests
- [ ] If multi-schema syntax has landed, the extension highlights `namespace`, `workspace`, `from`, and `::` paths correctly

---

## 11. Open Questions

1. Whether the TextMate grammar should be authored directly in JSON or generated from a YAML/DSL source for maintainability.
2. Whether the first extension release should bundle only syntax highlighting or also include simple document symbols if parser integration is already available.
3. Which test harness provides the best long-term fit for TextMate scope assertions in this repo.

---

## 12. Source Notes

External guidance reviewed for this PRD:

- VS Code Syntax Highlight Guide: https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide
- VS Code Language Configuration Guide: https://code.visualstudio.com/api/language-extensions/language-configuration-guide
- VS Code Semantic Highlight Guide: https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide

Inference based on those sources: official VS Code guidance describes TextMate grammars as the baseline mechanism for syntax highlighting and semantic tokens as an additional layer. It does not present Tree-sitter as the native extension path for baseline syntax colouring in VS Code.
