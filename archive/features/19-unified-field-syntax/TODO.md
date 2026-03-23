# Feature 19: Unified Field Syntax — TODO

## Phase 1: Grammar & Parser

### 1.1 Update tree-sitter grammar
- [ ] Replace `record_block` rule: `"record" label (meta) { body }` → field_decl where type is `record`
- [ ] Replace `list_block` rule: `"list" label (meta) { body }` → field_decl where type is `list_of record` or `list_of TYPE`
- [ ] Add `list_of` as a keyword token
- [ ] Add `each` keyword and `each_block` rule in mapping bodies
- [ ] Add `flatten` keyword and `flatten_block` rule in mapping bodies
- [ ] Remove `[]` from `_path_seg`, `field_path`, and `backtick_path` rules
- [ ] Remove `list` from reserved keywords; add `list_of`, `each`, `flatten`
- [ ] Update `nested_arrow` rule to become `each_block`
- [ ] Regenerate parser artifacts (`tree-sitter generate`)
- **Depends on:** nothing
- **Acceptance:** `tree-sitter generate` succeeds, parser compiles

### 1.2 Update corpus tests
- [ ] Rewrite `schemas.txt` — nested record/list test cases use new syntax
- [ ] Rewrite `nested_arrows.txt` → rename to `each_flatten.txt`, use `each`/`flatten` syntax
- [ ] Update `sap_po_patterns.txt` — list blocks with filter use new syntax
- [ ] Update `metadata.txt`, `metadata_values.txt` — if they reference record/list blocks
- [ ] Update `namespaces.txt` — if it has nested structures
- [ ] Update `recovery.txt` — malformed input tests for new syntax
- [ ] Add new corpus tests: `list_of` scalar, `list_of record`, `each` block, `flatten` block
- [ ] Add error recovery tests for common mistakes (e.g., old `list name {}` syntax)
- **Depends on:** 1.1
- **Acceptance:** `tree-sitter test` passes, all corpus fixtures green

### 1.3 Update tree-sitter fixture tests
- [ ] Update all fixture JSON files under `test/fixtures/examples/` as examples change
- [ ] Verify `test_fixtures.py` passes with zero errors
- **Depends on:** 1.2, 2.1
- **Acceptance:** `python3 test_fixtures.py` exits 0

## Phase 2: Examples & Specification

### 2.1 Migrate all example files
- [ ] `cobol-to-avro.stm` — 6 records, 2 lists, 1 nested arrow
- [ ] `db-to-db.stm` — record/list blocks
- [ ] `edi-to-json.stm` — 5 records, 6 lists (3 with filter), nested arrows, `[]` paths
- [ ] `filter-flatten-governance.stm` — 2 records, 8 lists, flatten, `[]` paths
- [ ] `protobuf-to-parquet.stm` — 1 record, 2 lists, `[]` in arrows
- [ ] `sap-po-to-mfcs.stm` — 2 lists (1 with filter), nested arrow, `[]` paths
- [ ] `xml-to-parquet.stm` — 4 records, 2 lists, flatten, `[]` paths
- [ ] `lib/sfdc_fragments.stm` — 2 records
- [ ] Check and update namespace examples (`ns-merging.stm`, `ns-platform.stm`, `namespaces.stm`)
- [ ] Check and update remaining examples for any `record`/`list`/`[]` usage
- **Depends on:** 1.1 (grammar must parse new syntax)
- **Acceptance:** All examples parse with zero errors

### 2.2 Update SATSUMA-V2-SPEC.md
- [ ] Section 2.6 — update reserved keywords (remove `list`, add `list_of`, `each`, `flatten`)
- [ ] Section 3.1 — update field declaration description
- [ ] Section 3.3 — rewrite "Nested Structures" to document unified syntax
- [ ] Section 4.x — update mapping syntax for `each`/`flatten`
- [ ] Update all inline examples throughout the spec
- [ ] Search for any remaining `record name {`, `list name {`, or `[]` references
- **Depends on:** 2.1 (examples should be final before spec references them)
- **Acceptance:** Spec is internally consistent; no old syntax references remain

### 2.3 Update AI-AGENT-REFERENCE.md
- [ ] Update EBNF grammar notation (lines 29-32)
- [ ] Update quick reference schema block examples (lines 77-89)
- [ ] Update mapping block examples — replace `[]` with `each`/`flatten`
- [ ] Update any tips/rules that reference old syntax
- **Depends on:** 2.2
- **Acceptance:** Agent reference matches spec; no old syntax references remain

### 2.4 Update other documentation
- [ ] `PROJECT-OVERVIEW.md` — if it references syntax
- [ ] `FUTURE-WORK.md` — if it references record/list syntax
- [ ] Feature docs in `features/` — update any that reference old syntax
- [ ] `docs/conventions-for-schema-formats/` — 12 convention files with 46 old-syntax occurrences (marc21, x12-hipaa, icalendar, cobol-copybook, asn1, hl7, swift-mt, iso20022, fix-protocol, dicom, iso8583)
- [ ] `docs/data-modelling/datavault/link-inventory.stm` — 2 occurrences
- [ ] `docs/ast-mapping.md` — `[]` array segment reference
- [ ] `docs/tree-sitter-ambiguities.md` — `[]` nested arrow example
- [ ] `docs/tree-sitter-precedence.md` — `[]` path parsing references
- **Depends on:** 2.2
- **Acceptance:** grep for old patterns returns zero hits across all docs and .stm files

## Phase 3: CLI Tooling

### 3.1 Update extract.ts
- [ ] Handle new CST node types for unified field declarations
- [ ] Replace `record_block`/`list_block` detection with new node type checks
- [ ] Update `extractFieldTree()` for new structure
- [ ] Update `extractSingleArrow()` — paths no longer contain `[]`
- [ ] Update `cleanPathText()` if needed
- **Depends on:** 1.1 (need to know final CST node names)
- **Acceptance:** Unit tests for extraction pass

### 3.2 Update index-builder.ts and types.ts
- [ ] Update `FieldDecl` type — `isList` derivation from new node types
- [ ] Update field tree indexing for `list_of record` vs `list_of TYPE`
- **Depends on:** 3.1
- **Acceptance:** Index builds correctly from new syntax

### 3.3 Update spread-expand.ts
- [ ] Remove `[]` generation from `collectFieldPaths()`
- [ ] Update path logic for list fields
- **Depends on:** 3.2
- **Acceptance:** Spread expansion works with new syntax

### 3.4 Update CLI commands
- [ ] `schema.ts` — display format for record/list_of fields
- [ ] `find.ts` — nested structure traversal
- [ ] `where-used.ts` — spread traversal in new structures
- [ ] `meta.ts` — metadata extraction from new node layout
- [ ] `nl.ts` — NL extraction traversal
- [ ] `nl-extract.ts` — same
- [ ] `graph.ts` — if field edge building references `[]` or old node types
- [ ] `arrows.ts` — if it references `[]` in path handling
- **Depends on:** 3.1, 3.2
- **Acceptance:** Each command produces correct output for new syntax

### 3.5 Update CLI tests
- [ ] Update all test fixtures and assertions that reference old syntax
- [ ] Update bug-purge tests if they reference `[]` or old node types
- [ ] Update graph tests
- [ ] Update namespace tests
- [ ] Add new tests for `list_of`, `each`, `flatten` handling
- **Depends on:** 3.4
- **Acceptance:** All 624+ CLI tests pass

## Phase 4: VS Code Extension

### 4.1 Update TextMate grammar
- [ ] Update keyword patterns — remove `list` block matching, add `list_of`, `each`, `flatten`
- [ ] Update block label matching regex (currently expects `record`/`list` before label)
- [ ] Remove `[]` highlighting from path patterns
- [ ] Test highlighting on updated example files
- **Depends on:** 2.1 (need final examples to test against)
- **Acceptance:** Syntax highlighting correct for all new constructs

## Phase 5: Validation

### 5.1 Full repo checks
- [ ] `scripts/run-repo-checks.sh` exits 0
- [ ] All tree-sitter corpus tests pass
- [ ] All CLI tests pass
- [ ] All fixture tests pass
- [ ] No old syntax (`record name {`, `list name {`, `[]` in paths) in any `.stm` or doc file
- **Depends on:** all above
- **Acceptance:** Clean CI run
