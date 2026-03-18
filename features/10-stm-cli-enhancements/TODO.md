# TODO: STM CLI — Structural Primitives for Agent Composition

Depends on Feature 09 (STM CLI: LLM Context Slicer) being complete.

## Phase 0: Transform Classifier and Field-Level Index

Foundation modules that all new commands build on.

- [ ] Create `src/classify.js`:
  - [ ] `classifyTransform(pipeChainNode)` → `'structural' | 'nl' | 'mixed' | 'none'` by inspecting CST pipe step node types
  - [ ] `classifyArrow(arrowNode)` → `{ classification, derived }` combining transform classification with arrow type
- [ ] Extend `src/extract.js` to capture per-arrow records:
  - [ ] Source field path, target field path
  - [ ] Raw transform text (verbatim from CST)
  - [ ] Decomposed pipe steps: `[{ type, text }]` from CST child nodes
  - [ ] Classification from `classify.js`
  - [ ] `derived` flag (no source path)
  - [ ] File and line number
- [ ] Add `fieldArrows` to `WorkspaceIndex`: `Map<"schema.field", ArrowRecord[]>`
- [ ] Build field arrows index during workspace index construction
- [ ] Unit tests for classifier against structural, NL, mixed, and bare arrows
- [ ] Unit tests for field-level extraction against `examples/` corpus
- [ ] Verify existing commands still pass with the extended index

## Phase 1: `stm arrows`

- [ ] Implement `src/commands/arrows.js`
- [ ] Accept `<schema.field>` argument; parse into schema name + field name
- [ ] Look up `fieldArrows` index for all arrows involving this field (as source or target)
- [ ] Default output: arrows grouped by mapping, showing `src -> tgt { transform }  [classification]`
- [ ] `--as-source`: only arrows where the field is the source
- [ ] `--as-target`: only arrows where the field is the target
- [ ] `--json`: structured output with decomposed pipe steps
- [ ] Error: exit 1 if schema or field not found
- [ ] Register command in `src/index.js`
- [ ] Write tests:
  - [ ] Field with structural transform shows `[structural]`
  - [ ] Field with NL transform shows `[nl]` and includes raw text
  - [ ] Field with mixed transform shows `[mixed]`
  - [ ] `--as-source` and `--as-target` filter correctly
  - [ ] `--json` includes decomposed steps
  - [ ] Unknown field exits 1

## Phase 2: `stm nl`

- [ ] Create `src/nl-extract.js`:
  - [ ] Walk a CST subtree and collect all `nl_string`, `multiline_string`, `note_block`, `note_tag`, `warning_comment`, `question_comment` nodes
  - [ ] For each: record the raw text, the structural position (block-level note, field note, transform step, warning, question), and the parent block/field name
- [ ] Implement `src/commands/nl.js`
- [ ] Accept scope argument: `schema <name>`, `mapping <name>`, `field <schema.field>`, or `all`
- [ ] Default output: NL items grouped by scope, showing text and position type
- [ ] `--kind <type>`: filter to `note`, `warning`, `question`, `transform`
- [ ] `--json`: structured output with position info
- [ ] Error: exit 1 if scope not found
- [ ] Register command in `src/index.js`
- [ ] Write tests:
  - [ ] Schema scope extracts schema-level notes and field-level notes
  - [ ] Mapping scope extracts NL transform bodies and mapping notes
  - [ ] Field scope extracts just that field's NL content
  - [ ] `--kind transform` filters to transform NL only
  - [ ] `all` scope returns everything across the workspace

## Phase 3: `stm meta`

- [ ] Create `src/meta-extract.js`:
  - [ ] Extract structured metadata from `metadata` CST nodes
  - [ ] Parse into: tags (standalone tokens), key-value pairs, enum bodies, note strings
  - [ ] For fields: also include the type string
- [ ] Implement `src/commands/meta.js`
- [ ] Accept scope argument: `schema <name>`, `field <schema.field>`, `mapping <name>`, `metric <name>`
- [ ] Default output: metadata entries listed by type (tags, key-value, enum, note)
- [ ] `--tags-only`: just tag tokens, one per line
- [ ] `--json`: structured metadata object
- [ ] Error: exit 1 if scope not found
- [ ] Register command in `src/index.js`
- [ ] Write tests:
  - [ ] Schema metadata extracts note and tags
  - [ ] Field metadata extracts type, tags, enum values, key-value pairs
  - [ ] Mapping metadata extracts tags and notes
  - [ ] `--tags-only` returns just tokens

## Phase 4: `stm fields` enhancements

- [ ] Implement `src/commands/fields.js` (or extend existing `schema --fields-only` into a standalone command)
- [ ] Accept `<schema>` argument
- [ ] Default output: field name, type, one line per field
- [ ] `--with-meta`: include metadata tags inline
- [ ] `--unmapped-by <mapping>`: set-difference between schema's declared fields and the named mapping's arrow target paths; list only fields with no arrows
- [ ] `--json`: structured field array
- [ ] Error: exit 1 if schema not found; exit 1 if mapping not found (for `--unmapped-by`)
- [ ] Register command in `src/index.js`
- [ ] Write tests:
  - [ ] Lists all fields with correct types
  - [ ] `--with-meta` includes tags
  - [ ] `--unmapped-by` returns correct set difference
  - [ ] Field covered by a derived arrow is NOT in the unmapped list
  - [ ] Unknown schema exits 1

## Phase 5: `stm match-fields`

- [ ] Create `src/normalize.js`:
  - [ ] `normalizeName(name)` → lowercase, strip `_` and `-`
  - [ ] `matchFields(sourceFields, targetFields)` → `{ matched, sourceOnly, targetOnly }`
  - [ ] Match is exact string equality after normalization — no scoring, no thresholds
- [ ] Implement `src/commands/match-fields.js`
- [ ] Accept `--source <schema>` and `--target <schema>`
- [ ] Default output: matched pairs with normalized form, source-only list, target-only list
- [ ] `--matched-only`: show only matches
- [ ] `--unmatched-only`: show only unmatched fields from both sides
- [ ] `--json`: structured output
- [ ] Error: exit 1 if source or target schema not found
- [ ] Register command in `src/index.js`
- [ ] Write tests:
  - [ ] `FirstName` matches `first_name` (both normalize to `firstname`)
  - [ ] `Email` matches `email`
  - [ ] `MailingCity` does NOT match `city` (different normalized forms)
  - [ ] Source-only and target-only lists are correct
  - [ ] Unknown schema exits 1

## Phase 6: `stm validate`

- [ ] Create `src/validate.js` module with two check categories:
  - [ ] **Structural checks**: walk tree-sitter CST for ERROR and MISSING nodes, report file/line/column/context
  - [ ] **Semantic checks** (run against `WorkspaceIndex`):
    - [ ] Schema referenced in mapping source/target but not defined
    - [ ] Fragment spread referencing undefined fragment
    - [ ] Transform spread referencing undefined transform
    - [ ] Duplicate schema/mapping/fragment/transform names
    - [ ] Arrow source field not present in declared source schema
    - [ ] Arrow target field not present in declared target schema
    - [ ] Metric source referencing undefined schema
- [ ] Implement `src/commands/validate.js`
- [ ] Default output: `file:line:col  severity  message`, grouped by file
- [ ] Summary line: `N errors, N warnings in N files`
- [ ] `--json`: array of `{ file, line, column, severity, rule, message }`
- [ ] `--errors-only`: suppress warnings
- [ ] `--quiet`: exit code only (0 = clean, 2 = errors)
- [ ] Register command in `src/index.js`
- [ ] Write tests:
  - [ ] Valid workspace produces 0 errors
  - [ ] File with parse errors reports correct line/column
  - [ ] Undefined schema reference produces semantic warning
  - [ ] Duplicate name produces semantic warning
  - [ ] Arrow referencing non-existent field produces semantic warning
  - [ ] `--quiet` returns correct exit code
  - [ ] `--json` produces valid JSON

## Phase 7: `stm diff`

- [ ] Create `src/diff.js` module:
  - [ ] Accept two `WorkspaceIndex` instances (or two paths to build them)
  - [ ] Compare schemas: added, removed, changed (field list or metadata differs)
  - [ ] Compare fields within schemas: added, removed, type changed, metadata changed
  - [ ] Compare mappings: added, removed, changed (arrows differ)
  - [ ] Compare arrows within mappings: added, removed, transform text changed
  - [ ] Return structured delta object
- [ ] Implement `src/commands/diff.js`
- [ ] Accept two file or directory paths
- [ ] Build a `WorkspaceIndex` from each, compute delta via `diff.js`
- [ ] Default output: grouped by block type, then by block name, showing changes with `+`/`-`/`~` markers
- [ ] `--json`: structured delta object
- [ ] `--names-only`: list changed block names only
- [ ] `--stat`: summary counts (schemas changed, fields added/removed/changed, arrows added/removed)
- [ ] Register command in `src/index.js`
- [ ] Write tests:
  - [ ] Identical files produce empty diff
  - [ ] Added field shows as `+`
  - [ ] Removed field shows as `-`
  - [ ] Type change shows as `~`
  - [ ] Added/removed arrows in mappings
  - [ ] Directory-level diff aggregates across files

## Phase 8: Documentation

- [ ] Update `stm --help` with three-tier grouping (workspace extractors, structural primitives, structural analysis)
- [ ] Add `--help` for each new command stating what structural operation it performs and that NL content is extracted verbatim, not interpreted
- [ ] Update `STM-CLI.md` with new command reference and "How agents compose primitives" section
- [ ] Update `AI-AGENT-REFERENCE.md` CLI section with primitive commands and agent workflow patterns
- [ ] Document the intended limitations of the CLI explicitly: what it can do (structural extraction), what it cannot do (NL interpretation), and why the boundary exists
- [ ] Include example agent workflows (impact, coverage, audit, mapping draft, readiness) showing how an agent composes primitives

## Phase 9: Integration Tests

- [ ] Write integration tests in `tooling/stm-cli/test/` using `examples/` and the Data Vault example as fixtures
- [ ] `stm arrows` returns correct arrows with correct classification for fields across example corpus
- [ ] `stm nl` extracts all NL content for schemas and mappings in examples
- [ ] `stm meta` extracts correct metadata for schemas and fields
- [ ] `stm fields --unmapped-by` returns correct set difference
- [ ] `stm match-fields` returns correct normalized matches between example schemas
- [ ] `stm validate` on clean workspace exits 0
- [ ] `stm validate` on workspace with injected errors reports correct diagnostics
- [ ] `stm diff` between original and modified fixture shows expected delta
- [ ] All commands produce valid JSON with `--json`
- [ ] Exit codes are correct for success, not-found, and error cases

## Acceptance Checklist

- [ ] `stm arrows` returns field-level arrows with correct transform classification
- [ ] `stm nl` extracts NL content with structural position info
- [ ] `stm meta` extracts metadata entries for any block or field
- [ ] `stm fields --unmapped-by` correctly identifies fields with no arrows
- [ ] `stm match-fields` returns correct exact-after-normalization matches
- [ ] `stm validate` reports structural and semantic issues with file/line detail
- [ ] `stm diff` produces correct structural delta
- [ ] All commands support `--json` and produce valid JSON
- [ ] All commands follow exit code conventions (0/1/2)
- [ ] CLI --help text explicitly states the CLI is a structural extraction tool that does not interpret NL
- [ ] Existing Feature 09 commands are unaffected
