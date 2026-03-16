# TODO: VS Code Syntax Highlighter for STM

## Phase 0: Scope, dependencies, and repo shape

- [ ] Confirm the feature boundary from [PRD.md](/Users/thorben/dev/personal/stm/features/03-vscode-syntax-highlighter/PRD.md)
- [ ] Confirm dependency on [features/01-treesitter-parser/PRD.md](/Users/thorben/dev/personal/stm/features/01-treesitter-parser/PRD.md)
- [ ] Check whether [features/02-multi-schema/PRD.md](/Users/thorben/dev/personal/stm/features/02-multi-schema/PRD.md) has landed or must be tracked as follow-up syntax support
- [ ] Create extension workspace at `tooling/vscode-stm/`
- [ ] Add a README describing scope:
  - [ ] baseline syntax highlighting via TextMate grammar
  - [ ] editor configuration via `language-configuration.json`
  - [ ] future semantic tokens via parser/LSP, not in MVP
- [ ] Decide authoring format for the TextMate grammar:
  - [ ] JSON directly
  - [ ] YAML or source format compiled to JSON
- [ ] Document the decision and generation workflow if the grammar is authored indirectly
- [ ] List STM syntax areas that TextMate can only approximate and must not overfit with brittle regexes
- [ ] Record the current doc mismatch in [IMPLEMENTATION-GUIDE.md](/Users/thorben/dev/personal/stm/IMPLEMENTATION-GUIDE.md) where syntax highlighting is described as "via tree-sitter grammar"

## Phase 1: Shared syntax inventory and token taxonomy

- [ ] Read [STM-SPEC.md](/Users/thorben/dev/personal/stm/STM-SPEC.md) and extract the complete syntax-highlighting inventory
- [ ] Review canonical examples in [examples/](/Users/thorben/dev/personal/stm/examples)
- [ ] Review parser deliverables and CST conventions from [features/01-treesitter-parser/PRD.md](/Users/thorben/dev/personal/stm/features/01-treesitter-parser/PRD.md)
- [ ] Define a shared token taxonomy covering:
  - [ ] declaration keywords
  - [ ] flow keywords
  - [ ] literals
  - [ ] comments
  - [ ] tags and annotations
  - [ ] operators and punctuation
  - [ ] identifiers and path segments
- [ ] Map STM token categories to standard TextMate scopes
- [ ] Document where parser node kinds should eventually map to semantic token types
- [ ] Identify ambiguous constructs that should remain baseline-highlighted only:
  - [ ] source vs target path roles inside `map`
  - [ ] schema id vs field id in dotted paths
  - [ ] soft keyword usage as identifiers
  - [ ] map-body constructs that require structural awareness
- [ ] Write a short parser/editor token mapping note, or create a placeholder for it if it belongs outside the feature directory

## Phase 2: Test-first fixture plan

- [ ] Define the highlighting test strategy before implementing the grammar
- [ ] Choose a non-interactive harness for TextMate scope assertions or snapshot tests
- [ ] Add fixture directories for:
  - [ ] canonical full-file examples
  - [ ] focused valid snippets
  - [ ] malformed/editing-state snippets
- [ ] Reuse canonical files from [examples/](/Users/thorben/dev/personal/stm/examples) as golden fixtures wherever practical
- [ ] Add targeted snippet fixtures for:
  - [ ] block declarations
  - [ ] field declarations
  - [ ] tag lists and enum values
  - [ ] annotations
  - [ ] multiline `note '''...'''` blocks
  - [ ] map headers
  - [ ] direct map entries
  - [ ] computed map entries
  - [ ] nested maps
  - [ ] transform pipelines
  - [ ] `when` / `else` / `fallback` continuations
  - [ ] comment prefixes `//`, `//!`, `//?`
- [ ] Add malformed fixtures for acceptable degradation:
  - [ ] missing closing brace
  - [ ] unterminated string
  - [ ] unterminated multiline note
  - [ ] incomplete `->`
  - [ ] partial transform continuation
  - [ ] broken annotation or tag list
- [ ] Define expected scopes for each targeted fixture before grammar implementation

## Phase 3: Extension skeleton

- [ ] Create `tooling/vscode-stm/package.json`
- [ ] Register language id `stm`
- [ ] Associate `.stm` files with the language
- [ ] Add extension metadata sufficient for local install and testing
- [ ] Create `language-configuration.json`
- [ ] Configure:
  - [ ] line comments for `//`
  - [ ] bracket pairs for `{}`, `[]`, `()`
  - [ ] auto-closing pairs for quotes and brackets
  - [ ] surrounding pairs for quotes and brackets
  - [ ] indentation behavior if needed
- [ ] Create `syntaxes/` directory and wire the TextMate grammar into the extension manifest
- [ ] Add a minimal `README.md` with install, development, and test commands
- [ ] Ensure all commands are non-interactive and repo-local

## Phase 4: Baseline TextMate grammar

- [ ] Implement top-level declaration patterns for:
  - [ ] `import`
  - [ ] `integration`
  - [ ] `schema`
  - [ ] `source`
  - [ ] `target`
  - [ ] `table`
  - [ ] `message`
  - [ ] `event`
  - [ ] `lookup`
  - [ ] `fragment`
  - [ ] `map`
- [ ] Implement literal patterns for:
  - [ ] strings
  - [ ] numbers
  - [ ] booleans and null-like literals if supported by STM
- [ ] Implement identifier patterns for:
  - [ ] normal identifiers
  - [ ] backtick identifiers if supported in STM syntax
  - [ ] type identifiers
- [ ] Implement comment patterns for:
  - [ ] `//`
  - [ ] `//!`
  - [ ] `//?`
- [ ] Implement operator and delimiter patterns for:
  - [ ] `->`
  - [ ] `=>`
  - [ ] `:`
  - [ ] `.`
  - [ ] `|`
  - [ ] `@`
  - [ ] brackets and braces
- [ ] Implement tag and annotation patterns
- [ ] Implement note-block begin/end patterns for multiline `note '''...'''`
- [ ] Verify scope names are standard and theme-compatible

## Phase 5: STM-specific constructs and edge cases

- [ ] Add declaration-body patterns for schema fields and nested groups
- [ ] Add highlighting for tag arrays and enum sets
- [ ] Add highlighting for annotation names and parameters
- [ ] Add highlighting for map headers with optional source and target blocks
- [ ] Add highlighting for direct mappings `src -> tgt`
- [ ] Add highlighting for computed mappings `=> tgt`
- [ ] Add highlighting for nested map blocks `src[] -> tgt[] { ... }`
- [ ] Add highlighting for transform heads after `:`
- [ ] Add highlighting for pipeline continuation lines beginning with `|`
- [ ] Add highlighting for `when`, `else`, and `fallback` continuation lines
- [ ] Add highlighting for path syntax:
  - [ ] dotted paths
  - [ ] relative paths with leading `.`
  - [ ] array segments `[]`
  - [ ] backtick path segments if supported
- [ ] Handle soft keywords conservatively so valid identifiers are not mis-scoped
- [ ] Prefer simpler, stable patterns over deeply nested regexes that will drift from the spec

## Phase 6: Optional multi-schema support checkpoint

- [ ] If `02-multi-schema` has landed, extend the grammar for:
  - [ ] `namespace`
  - [ ] `workspace`
  - [ ] `from`
  - [ ] `::` namespace-qualified paths
- [ ] Add fixtures covering:
  - [ ] workspace file structure
  - [ ] namespace declarations
  - [ ] cross-namespace map headers
  - [ ] namespaced field references
- [ ] If `02-multi-schema` has not landed, record a blocked follow-up item rather than implementing speculative syntax

## Phase 7: Verification and regression coverage

- [ ] Run highlighting tests against every canonical `.stm` example
- [ ] Run targeted scope assertions against all focused fixtures
- [ ] Verify malformed fixtures degrade acceptably and do not catastrophically over-scope the rest of the file
- [ ] Open representative STM files in a local VS Code instance or extension test environment if available
- [ ] Check behaviour in at least one light theme and one dark theme
- [ ] Verify comments, note blocks, map operators, annotations, and tags all receive stable scopes
- [ ] Compare highlighted constructs against parser-covered syntax to catch drift early

## Phase 8: Parser-backed follow-on design

- [ ] Document which highlighting gaps require semantic tokens rather than more TextMate regex:
  - [ ] source-side vs target-side distinction
  - [ ] namespace/schema/field role disambiguation
  - [ ] context-aware path colouring in map bodies
- [ ] Decide whether semantic tokens should come from:
  - [ ] a lightweight VS Code extension host parser integration
  - [ ] a future STM language server
- [ ] Define the dependency gate for semantic highlighting:
  - [ ] stable Tree-sitter grammar
  - [ ] stable CST-to-AST mapping
  - [ ] reusable parser package or service boundary
- [ ] Add an implementation note describing how semantic tokens layer on top of TextMate scopes rather than replacing them

## Phase 9: Docs and quality gates

- [ ] Document install and local development workflow for `tooling/vscode-stm/`
- [ ] Document how to regenerate the grammar if an authored source format is used
- [ ] Document known approximation limits in the extension README
- [ ] Add repo docs pointing to the VS Code extension as the recommended editor entry point for STM
- [ ] Add CI or scripted checks for:
  - [ ] extension manifest validity
  - [ ] syntax fixture tests
  - [ ] non-interactive test execution
- [ ] Ensure parser-related docs cross-link to the VS Code extension plan and shared token mapping note

## Acceptance checklist

- [ ] `tooling/vscode-stm/` exists with a valid extension skeleton
- [ ] `.stm` files are recognised as language id `stm`
- [ ] Baseline syntax highlighting works across all canonical STM examples
- [ ] TextMate scopes are stable for keywords, literals, comments, tags, annotations, operators, and note blocks
- [ ] Highlighting tests cover both valid syntax and malformed editing states
- [ ] The implementation reuses parser fixtures or parser-derived syntax inventory rather than inventing a separate STM definition
- [ ] Any unsupported or approximate cases are documented near tests and in extension docs
- [ ] Multi-schema syntax is either covered or explicitly tracked as a dependency-based follow-up
- [ ] A clear semantic-token follow-on plan exists and depends on parser stability
