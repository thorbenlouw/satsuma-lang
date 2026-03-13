# Tree-sitter Parser Plan for STM

## Goal

Build a Tree-sitter parser for STM so tooling can produce a stable concrete syntax tree and a practical structured AST foundation for:

- `stm lint`
- `stm fmt`
- visualisers
- editor support
- code generation and analysis

The parser must cover the current STM v1.0.0 syntax in [STM-SPEC.md](/Users/thorben/dev/personal/stm/STM-SPEC.md) and the example corpus under [examples/](/Users/thorben/dev/personal/stm/examples).

## Problem

STM already has a detailed language spec, but there is no machine-checked parser in the repo. That blocks all serious tooling:

- linters cannot reason over maps, notes, tags, and annotations reliably
- formatters cannot preserve structure while normalising layout
- visualisers cannot traverse nested schemas and data flow paths
- editor integrations cannot provide syntax-aware features

We need a parser that is incremental, editor-friendly, and robust against incomplete input. Tree-sitter is the right fit because it gives us:

- incremental parsing for IDE use
- concrete syntax trees with byte/range data
- good error recovery
- a path to syntax highlighting, queries, and downstream AST builders

## Success Criteria

The feature is complete when:

1. A `tree-sitter-stm` grammar parses all current canonical examples.
2. The parser handles the full STM v1.0.0 surface area needed by tooling:
   - imports
   - integration blocks
   - schema/source/target/table/message/event/lookup blocks
   - fragment blocks and spreads
   - fields, groups, arrays, tag lists, annotations, field note blocks
   - map blocks, options, nested maps, computed maps, transform pipelines
   - `when` / `else` / `fallback` continuation lines
   - comments and `note` blocks
3. Parse trees expose enough structure to derive a semantic AST without reparsing raw text.
4. The grammar has corpus tests for valid syntax and representative error cases.
5. The repository documents AST conventions for downstream tools.

## Non-Goals

This feature does not include:

- semantic validation such as reference resolution or type checking
- `stm lint` rule implementation
- `stm fmt`
- import resolution or circular dependency detection
- code generation from STM

Those consumers should be enabled by this parser, not bundled into it.

## Primary Consumers

- lint engine
- formatter
- visual graph renderer
- VS Code or Zed extension
- future AST-to-IR compiler for code generators

## Functional Requirements

### 1. Full syntactic coverage

The grammar must model the constructs already present in the spec and examples:

- top-level declarations in any order
- block headers with optional descriptions and annotations
- nested object groups and array groups
- tag lists including `enum: { ... }`
- path syntax including dotted paths and `[]`
- map entry variants:
  - direct source-to-target
  - computed `=> target`
  - nested map `src[] -> tgt[] { ... }`
- transform expressions:
  - literal
  - pipe chain
  - `when` chains
  - `fallback`
- line comments with STM-specific prefixes: `//`, `//!`, `//?`
- multiline `note '''...'''` blocks

### 2. Concrete tree shape that supports a stable AST layer

The parse tree must make these nodes easy to derive:

- file
- import declaration
- integration block and integration field
- schema block, fragment block, field, group, spread
- tag, tag value, enum value
- annotation
- note
- map block, map option, map entry, nested map
- source path, target path
- transform pipeline, transform step, `when` branch, `else` branch, fallback clause
- comments with severity classification based on prefix

### 3. Error tolerance

The parser should recover usefully from common editing states:

- open block without closing brace
- incomplete path after `->`
- incomplete tag or annotation
- partial transform line after `:`
- unterminated multiline note

### 4. Tooling ergonomics

We should be able to attach Tree-sitter queries later for:

- syntax highlighting
- folding
- structural selection
- symbol extraction
- diagnostics anchoring

## Proposed Deliverables

### Deliverable 1: `tree-sitter-stm` grammar package

Suggested contents:

- `grammar.js`
- generated parser sources
- `queries/highlights.scm`
- `queries/folds.scm`
- `queries/locals.scm` if useful later
- `test/corpus/*`
- package metadata and README

### Deliverable 2: AST mapping document

A short design note describing how downstream tools should convert CST nodes into a semantic AST/IR. This should define:

- canonical node names
- which CST nodes are syntax-preserving only
- how comments and notes attach to surrounding declarations
- how multiline map transforms are grouped
- how relative paths like `.field` are represented

### Deliverable 3: Fixture suite

Use the existing STM examples as golden fixtures and add smaller targeted cases for:

- every annotation form
- arrays of primitives vs arrays of groups
- nested maps
- flatten/group_by/when options
- invalid and recovery cases

## Implementation Strategy

### Phase 1: Grammar boundary and AST contract

Define the parse boundary before writing rules.

Decisions to lock:

- Tree-sitter grammar produces CST, not semantic AST.
- We still design CST node names intentionally so an AST builder is straightforward.
- Newlines are significant around map transform continuations, but we should avoid making the grammar depend on formatting beyond what the spec requires.
- Comments should remain explicit syntax nodes or extras only if we can still recover severity and attachment strategy downstream.

Output:

- grammar node inventory
- AST mapping note
- precedence strategy for paths, transforms, tags, and annotations

### Phase 2: Lexical layer

Implement and test:

- identifiers
- backtick identifiers
- string literals
- multiline note strings
- numbers
- comment tokens
- punctuation and keywords

Risk area:

- triple-single-quoted note bodies and backtick escapes need deliberate tokenisation.

### Phase 3: Structural declarations

Implement:

- imports
- integration blocks
- schema-family blocks
- fragment blocks
- fields
- groups
- spreads
- tag lists
- annotations
- note attachments

Focus on preserving enough structure that schema visualisers and symbol indexes can work before map parsing is complete.

### Phase 4: Map grammar

Implement:

- map headers with optional source/target and options
- direct maps
- computed maps
- nested maps
- transform headers after `:`
- continuation lines beginning with `|`, `when`, `else`, `fallback`

This is the hardest phase. The plan should explicitly test ambiguous cases such as:

- `map { ... }` as a transform function vs `map ... { ... }` as a block
- nested map blocks vs field note blocks
- `when` in map headers vs transform continuations
- dotted paths with array segments and relative `.` prefixes

### Phase 5: Queries and fixtures

Add:

- highlight query coverage for keywords, strings, numbers, comments, tags, annotations, identifiers, paths
- fold queries for blocks and multiline notes
- corpus coverage across all official examples

### Phase 6: Consumer proof

Build one thin consumer to validate the parser is practically usable. Recommended proof:

- a small script that parses an STM file and emits a JSON summary of blocks, fields, maps, and comments

This keeps the feature honest without expanding into a full linter.

## Proposed CST/AST Conventions

Recommended CST node naming:

- `source_path`
- `target_path`
- `map_entry`
- `computed_map_entry`
- `nested_map`
- `transform_clause`
- `pipe_step`
- `when_clause`
- `else_clause`
- `fallback_clause`
- `tag_list`
- `annotation`
- `note_block`

Recommended semantic AST shape for downstream tools:

- top-level declarations become typed statements with `kind`
- blocks own children in source order
- comments are preserved with severity and byte range
- paths are tokenised into segments with `name`, `is_array`, `is_relative`
- transform sections become ordered clauses rather than flattened text

## Risks

### Grammar ambiguity in map syntax

STM intentionally compresses mapping syntax. The main parser risk is distinguishing:

- block-level `map`
- transform function `map { ... }`
- nested map entries
- note blocks attached to declarations

Mitigation:

- start with a written ambiguity list
- add corpus tests before refactors
- keep transform grammar explicit rather than overly permissive

### Newline-sensitive continuations

Map continuations are line-oriented. Tree-sitter can handle this, but only if the grammar treats continuation starters carefully.

Mitigation:

- keep transform continuation tokens explicit
- test one-line and multiline equivalents
- test malformed continuations for recovery quality

### Spec drift

The STM spec is still young and may change.

Mitigation:

- treat [STM-SPEC.md](/Users/thorben/dev/personal/stm/STM-SPEC.md) as the authority
- parse all example files in CI
- document unsupported future extensions explicitly rather than silently accepting them

## Acceptance Test Matrix

Minimum test categories:

- valid top-level file ordering permutations
- every block type
- every annotation type mentioned in the spec
- field tags with scalar, string, enum-list, and reference-like values
- comments in standalone and trailing positions
- nested groups and arrays
- path variants: absolute, relative, dotted, array segments, backtick segments
- map entry variants: direct, computed, nested
- transform variants: pipeline, literal, `when`, `fallback`, mixed multiline
- malformed syntax recovery cases
- all files in [examples/](/Users/thorben/dev/personal/stm/examples)

## Repository Layout Recommendation

If this repo will own the parser directly:

- `tooling/tree-sitter-stm/`

If the parser should be published independently:

- separate `tree-sitter-stm` repo, vendored back here for fixtures and integration tests

For current momentum, keeping it inside this repo first is the better choice. It reduces setup friction and lets the examples/spec stay the golden source.

## Milestones

1. Grammar skeleton parses imports and schema-family blocks.
2. Grammar parses all examples except map transforms.
3. Grammar parses full map syntax including continuations.
4. Corpus and error recovery suite are green.
5. Query files and AST mapping note are added.
6. Thin consumer script proves parser usability.

## Open Decisions

- Whether comments should be parse nodes or `extras` plus external attachment logic.
- Whether triple-quoted `note` content should preserve raw text exactly or expose dedented content later in the AST layer.
- Whether to publish bindings immediately or only after parser stability.
- Whether future semantic tooling should consume CST directly or a repo-local semantic AST package.

## Recommended Next Step

Start with a grammar spike that only parses:

- imports
- block headers
- fields/groups/spreads
- map headers
- simple `src -> tgt`

Then add transform continuation syntax once the structural tree shape is stable. That sequencing reduces churn in the hardest part of the grammar.
