# TODO: Tree-sitter Parser for STM v2

> **Status: COMPLETED** (2026-03-18). All phases done. 190/190 corpus tests pass, all examples parse clean. See `ACCEPTANCE-CHECKLIST.md` for sign-off.

## Phase 0: Teardown and setup

- [ ] Delete the existing `grammar.js`, corpus files, and queries in `tooling/tree-sitter-stm/` (preserve `package.json` and build config)
- [ ] Reset `src/` (regenerated from grammar; delete manually)
- [ ] Update `package.json` name/description to reflect v2
- [ ] Verify `tree-sitter` CLI and `node-gyp` still build cleanly after reset
- [ ] Create new empty corpus directories: `test/corpus/`
- [ ] Write `docs/cst-reference.md` skeleton (fill in as grammar is built)

## Phase 1: Grammar skeleton and lexical rules

- [ ] Define `source_file` as `repeat(top_level_item)`
- [ ] Define `top_level_item` choice: `import_decl`, `note_block`, `schema_block`, `fragment_block`, `transform_block`, `mapping_block`, `metric_block`
- [ ] Add lexical tokens:
  - [ ] `identifier` — bare ASCII identifier
  - [ ] `quoted_name` — single-quoted string (block labels)
  - [ ] `backtick_name` — backtick-quoted identifier (field names, references)
  - [ ] `nl_string` — double-quoted string
  - [ ] `multiline_string` — triple-double-quoted string
  - [ ] `type_token` — identifier with optional `(n)` or `(p,s)` parameter
  - [ ] `line_comment` — `//` to end of line
  - [ ] `warning_comment` — `//!` to end of line
  - [ ] `question_comment` — `//?` to end of line
- [ ] Add operator tokens: `->`, `|`, `...`, `:`, `_`
- [ ] Add keywords: `schema`, `fragment`, `mapping`, `transform`, `metric`, `source`, `target`, `map`, `record`, `list`, `note`, `import`, `default`
- [ ] Confirm keywords are not valid bare identifiers in label positions
- [ ] Add corpus file: `test/corpus/lexical.txt` — tokens and comment types

## Phase 2: Import declarations

- [ ] Parse `import { 'name', 'name2' } from "path"`
- [ ] Node types: `import_decl`, `import_name` (list), `import_path`
- [ ] Add corpus: `test/corpus/imports.txt`

## Phase 3: Metadata blocks

The `( )` metadata block is shared by schemas, fields, mappings, arrows, and metric blocks. Build it as a shared production.

- [ ] Parse `(` comma-separated `metadata_entry` list `)`
- [ ] `metadata_entry` choices:
  - [ ] `tag_token` — bare identifier (e.g. `pk`, `pii`, `required`)
  - [ ] `key_value_pair` — `identifier value` where value is a token, string, number, path, or brace-list
  - [ ] `enum_body` — `enum { token, token, ... }` (brace-enclosed token list)
  - [ ] `slice_body` — `slice { token, token, ... }` (same production as `enum_body`)
  - [ ] `note_tag` — `note "..."` or `note """..."""` inside metadata
- [ ] Metadata block spans multiple lines (tree-sitter handles via `extras`)
- [ ] Add corpus: `test/corpus/metadata.txt` — all metadata forms, multi-line, nested brace lists

## Phase 4: Schema and fragment blocks

- [ ] Parse `schema <label> (<metadata>)? { <body> }`
- [ ] Parse `fragment <label> { <body> }` (no metadata block)
- [ ] Shared `schema_body` production:
  - [ ] `field_decl` — `<name> <type_token> (<metadata>)?`
  - [ ] `record_block` — `record <label> (<metadata>)? { <schema_body> }`
  - [ ] `list_block` — `list <label> (<metadata>)? { <schema_body> }`
  - [ ] `fragment_spread` — `... identifier` or `... 'quoted name'`
  - [ ] `note_block`
- [ ] Recurse: `record_block` and `list_block` use `schema_body` (test 3-level nesting)
- [ ] Add corpus: `test/corpus/schemas.txt`
- [ ] Add corpus: `test/corpus/fragments.txt`

## Phase 5: Transform blocks

- [ ] Parse `transform <label> { <transform_body> }`
- [ ] `transform_body` is a `pipe_chain` (shared with arrow transform bodies)
- [ ] Add corpus: `test/corpus/transforms.txt`

## Phase 6: Mapping blocks

- [ ] Parse `mapping <label>? (<metadata>)? { <mapping_body> }`
- [ ] `mapping_body`:
  - [ ] `source_block` — `source { <source_entry>* }`
  - [ ] `target_block` — `target { <target_entry> }`
  - [ ] `note_block`
  - [ ] `arrow_decl` (see below)
- [ ] `source_entry`: `backtick_ref`, bare `identifier`, or `nl_string` (join description)
- [ ] `target_entry`: `backtick_ref` or bare `identifier`
- [ ] Arrow declarations:
  - [ ] `map_arrow` — `src_path -> tgt_path (<metadata>)? transform_body?`
  - [ ] `computed_arrow` — `-> tgt_path (<metadata>)? transform_body?`
  - [ ] `nested_arrow` — `src_path[] -> tgt_path[] (<metadata>)? { arrow_decl* }`
- [ ] Path types (shared `path` production):
  - [ ] Dotted path: `a.b.c`
  - [ ] Array path: `items[]`, `Order.LineItems[]`
  - [ ] Relative path: `.field`, `.nested.field`
  - [ ] Backtick path: `` `Lead_Source__c` ``
  - [ ] Namespaced path: `schema.field` (not to be confused with dotted nested path — both are dotted; caller context distinguishes)
- [ ] `transform_body` — `{ pipe_chain }`
- [ ] `pipe_chain` — `pipe_step (| pipe_step)*`
- [ ] `pipe_step` choices:
  - [ ] `nl_string`
  - [ ] `token_call` — `identifier ( args? )`
  - [ ] `bare_token` — `identifier` (no parens, e.g. `trim`, `lowercase`)
  - [ ] `map_literal` — `map { map_entry* }`
  - [ ] `fragment_spread` — `...name`
- [ ] `map_literal`:
  - [ ] `map_entry` — `map_key : map_value`
  - [ ] `map_key` choices: token, string, number, comparison (`< 1000`), `null`, `default`, `_`
  - [ ] `map_value` choices: string, number, `null`
- [ ] Add corpus: `test/corpus/mappings.txt`
- [ ] Add corpus: `test/corpus/arrows.txt`
- [ ] Add corpus: `test/corpus/transforms_in_arrows.txt`
- [ ] Add corpus: `test/corpus/value_maps.txt`
- [ ] Add corpus: `test/corpus/nested_arrows.txt`

## Phase 7: Metric blocks

- [ ] Parse `metric <label> <display_name>? (<metadata>) { <metric_body> }`
  - [ ] `block_label` — bare identifier or single-quoted string
  - [ ] `metric_display_name` — `nl_string` (the quoted short label, e.g. `"MRR"`)
  - [ ] `metadata_block` — full metadata block (reuse Phase 3)
  - [ ] `metric_body` — `(field_decl | note_block)*`
- [ ] Vocabulary tokens in metric metadata (captured as `key_value_pair` or `tag_token`):
  - [ ] `source` — single schema name or brace list of schema names
  - [ ] `grain` — single token
  - [ ] `slice` — brace-enclosed token list (use `slice_body` from Phase 3)
  - [ ] `filter` — NL string condition
- [ ] `measure` tag on fields inside metric bodies:
  - [ ] `(measure additive)`, `(measure non_additive)`, `(measure semi_additive)` parsed as `tag_token` sequence
- [ ] Ensure `metric_block` is a distinct node type from `schema_block`
- [ ] Add corpus: `test/corpus/metrics.txt` covering:
  - [ ] Metric with all metadata keys
  - [ ] Metric with multi-schema source (brace list)
  - [ ] Metric body with multiple measure fields and a note block
  - [ ] Metric with no display name

## Phase 8: Note blocks

- [ ] Parse `note { "..." }` and `note { """...""" }`
- [ ] `note_block` node contains `string_literal` or `multiline_string`
- [ ] Note blocks are valid at file top level and inside mapping and metric bodies
- [ ] Add corpus: `test/corpus/notes.txt`

## Phase 9: Comments

- [ ] Confirm `line_comment` (`//`) appears in CST as a named extra node
- [ ] Confirm `warning_comment` (`//!`) is a distinct named node from `line_comment`
- [ ] Confirm `question_comment` (`//?`) is a distinct named node
- [ ] Add corpus tests verifying all three are present in the tree (not silently dropped)
- [ ] Verify they can appear after any statement and on their own lines

## Phase 10: Queries

- [ ] Write `queries/highlights.scm`:
  - [ ] Keywords: `schema`, `fragment`, `mapping`, `transform`, `metric`, `source`, `target`, `map`, `record`, `list`, `note`, `import`
  - [ ] Operators: `->`, `|`, `...`
  - [ ] Block labels and display names
  - [ ] Field names and types
  - [ ] Metadata tokens (`pk`, `pii`, `required`, etc.)
  - [ ] NL strings and multiline strings
  - [ ] All three comment types (with distinct highlight groups for `//!` and `//?`)
  - [ ] Map keys and values
- [ ] Write `queries/folds.scm` — fold on block bodies `{ }`
- [ ] Write `queries/locals.scm` — block label definitions and backtick references for LSP

## Phase 11: Smoke-test script

- [ ] Write `scripts/smoke-test.js` that:
  - [ ] Accepts a `.stm` file path as argument
  - [ ] Parses it with the tree-sitter binding
  - [ ] Emits JSON summary:
    ```json
    {
      "schemas": [{ "name": "...", "fields": [...], "metadata": [...] }],
      "metrics": [{ "name": "...", "displayLabel": "...", "sources": [...], "grain": "...", "slices": [...] }],
      "mappings": [{ "name": "...", "sources": [...], "target": "...", "arrows": [...] }],
      "fragments": [...],
      "transforms": [...],
      "warnings": ["//! comment text"],
      "questions": ["//?  comment text"]
    }
    ```
  - [ ] Run against every file in `examples/` with no parse errors

## Phase 12: Error recovery corpus

- [ ] Add `test/corpus/recovery.txt` with malformed inputs and expected partial trees:
  - [ ] Missing closing `}` on schema body
  - [ ] Unterminated multiline string
  - [ ] Arrow with missing target path
  - [ ] Metadata block with unclosed `(`
  - [ ] `map { }` with malformed entry
  - [ ] `metric` with no metadata block

## Phase 13: CI and docs

- [ ] Update `tooling/tree-sitter-stm/docs/cst-reference.md` with all node type names
- [ ] Add grammar generation command to project-level `README.md` or `AGENTS.md`
- [ ] Confirm `tree-sitter generate && tree-sitter test` runs clean in CI
- [ ] Document any accepted grammar conflicts in `CONFLICTS.expected`

## Acceptance checklist

- [ ] All `examples/*.stm` files parse with zero errors
- [ ] All corpus tests pass (`tree-sitter test`)
- [ ] `smoke-test.js` produces valid JSON for every example file
- [ ] `queries/highlights.scm` produces correct highlight ranges on all examples (manual verification)
- [ ] All three comment types appear as named nodes in the CST
- [ ] `metric_block` is a distinct node type from `schema_block`
- [ ] `warning_comment` and `question_comment` are distinct node types from `line_comment`
- [ ] No undocumented conflicts in the generated parser
