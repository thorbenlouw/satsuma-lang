# TODO: Tree-sitter Parser for STM

## Phase 0: Scope and structure

- [ ] Create parser workspace, preferably `tooling/tree-sitter-stm/`
- [ ] Decide package ownership: in-repo first, publish later
- [ ] Add README describing scope: syntax parser only, no semantic validation
- [ ] Write `docs/ast-mapping.md` for CST-to-AST conventions
- [ ] List grammar ambiguities from [STM-SPEC.md](/Users/thorben/dev/personal/stm/STM-SPEC.md) before implementation

## Phase 1: Grammar skeleton

- [ ] Bootstrap Tree-sitter grammar files
- [ ] Define top-level `source_file`
- [ ] Parse:
  - [ ] `import`
  - [ ] `integration`
  - [ ] schema-family blocks: `source`, `target`, `schema`, `table`, `message`, `event`, `lookup`
  - [ ] `fragment`
  - [ ] `mapping`
- [ ] Add punctuation, keyword, and identifier tokens
- [ ] Add string and number literals
- [ ] Add backtick identifier support
- [ ] Add line comment support for `//`, `//!`, `//?`
- [ ] Add multiline `note '''...'''` support

## Phase 2: Schema and fragment bodies

- [ ] Parse integration fields and tag arrays like `tags [a, b, c]`
- [ ] Parse field declarations with optional `[]`
- [ ] Parse type expressions with optional parameter lists
- [ ] Parse tag lists and enum value sets
- [ ] Parse field annotations
- [ ] Parse group declarations and array groups
- [ ] Parse fragment spreads like `...address_fields`
- [ ] Parse inline note blocks attached to fields
- [ ] Add corpus tests for every schema construct

## Phase 3: Map syntax

- [ ] Parse mapping headers with optional `source -> target`
- [ ] Parse mapping options:
  - [ ] `flatten: path[]`
  - [ ] `group_by: path`
  - [ ] `when: condition`
  - [ ] custom options if the spec allows them
- [ ] Parse direct map entries `src -> tgt`
- [ ] Parse computed entries `=> tgt`
- [ ] Parse nested maps `src[] -> tgt[] { ... }`
- [ ] Parse inline map-entry note blocks
- [ ] Parse transform heads after `:`
- [ ] Parse pipeline continuation lines starting with `|`
- [ ] Parse `when` / `else` continuation lines
- [ ] Parse `fallback` continuation lines
- [ ] Parse literal and function-call transform expressions
- [ ] Add targeted ambiguity tests for `map` keyword collisions

## Phase 4: Paths, conditions, and expressions

- [ ] Parse dotted paths
- [ ] Parse relative paths with leading `.`
- [ ] Parse array segments like `items[]`
- [ ] Parse backtick path segments
- [ ] Define minimal expression support needed by:
  - [ ] annotation params
  - [ ] tag values
  - [ ] conditions in filters and `when`
  - [ ] transform function arguments
- [ ] Confirm the grammar handles examples with:
  - [ ] `in (...)`
  - [ ] `==`, `!=`, `<`
  - [ ] booleans and `null`
  - [ ] map literals like `map { A: "a", _: "fallback" }`

## Phase 5: Queries and fixtures

- [ ] Add `test/corpus/` files split by feature area
- [ ] Add full-file fixture tests for all files in [examples/](/Users/thorben/dev/personal/stm/examples)
- [ ] Add malformed fixture tests for recovery:
  - [ ] missing `}`
  - [ ] unterminated note
  - [ ] broken tag list
  - [ ] partial transform line
  - [ ] incomplete path after `->`
- [ ] Add `queries/highlights.scm`
- [ ] Add `queries/folds.scm`
- [ ] Add query tests if the chosen setup supports them

## Phase 6: Consumer proof

- [ ] Add a small parser smoke-test script that emits JSON summaries from CST
- [ ] Prove extraction of:
  - [ ] blocks and descriptions
  - [ ] schema fields and groups
  - [ ] map entries and paths
  - [ ] comments and severity
  - [ ] notes and annotations
- [ ] Run the script against every example file

## Phase 7: CI and quality gates

- [ ] Add parser generation and test commands to project docs
- [ ] Add CI step to run corpus tests
- [ ] Add CI step to parse every `.stm` example
- [ ] Fail CI on parser conflicts unless explicitly accepted and documented
- [ ] Document supported STM version in the parser README

## Acceptance checklist

- [ ] All example `.stm` files parse successfully
- [ ] No unresolved high-risk grammar ambiguities remain undocumented
- [ ] CST node names are stable enough for downstream AST consumers
- [ ] Comments, notes, tags, annotations, and map continuations are structurally recoverable
- [ ] At least one downstream proof script works without reparsing raw text
