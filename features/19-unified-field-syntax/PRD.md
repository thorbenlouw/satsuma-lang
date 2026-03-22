# Feature 19: Unified Field Syntax

## Problem

Satsuma v2 has two syntactic patterns for declaring data within a schema:

1. **Scalar fields:** `name TYPE (metadata)` — name-first, reads left-to-right.
2. **Nested structures:** `record name (metadata) { ... }` / `list name (metadata) { ... }` — keyword-first, reads differently.

This inconsistency creates friction:

- Authors must remember two declaration patterns depending on whether a field is scalar or composite.
- Scalar lists (arrays of primitives with no subfields) have no natural home — the current workaround is an empty `list` block with the element type buried in a `note` string, which is not machine-readable.
- The `[]` syntax in mapping arrows (e.g., `line_items[].sku -> sku`) is borrowed from programming languages but reads poorly alongside Satsuma's otherwise English-like mapping declarations.
- `record` and `list` are reserved keywords that serve no purpose beyond introducing a block — the name and the braces already tell you it's a structure.

## Proposed Syntax

### Schema Declarations

All declarations follow a single pattern: **`NAME TYPE (metadata) { body }`**, where TYPE, metadata, and body are each optional depending on context.

#### Simple field (unchanged)

```stm
email STRING (pii, required)
```

#### Single nested structure (record)

Old:
```stm
record customer {
  id    UUID (pk)
  email STRING (pii)
}
```

New:
```stm
customer record (note "embedded customer info") {
  id    UUID (pk)
  email STRING (pii)
}
```

The keyword `record` moves to the TYPE position. The name comes first, matching scalar fields.

#### List of records

Old:
```stm
list line_items (filter item_status != "cancelled") {
  sku       STRING (required)
  quantity  INT
}
```

New:
```stm
line_items list_of record (filter item_status != "cancelled") {
  sku       STRING (required)
  quantity  INT
}
```

`list_of` is a single keyword (with underscore — one token, no ambiguity). `record` after `list_of` signals the list contains structured elements with subfields.

#### Scalar list (list of primitives)

Old (workaround):
```stm
list promo_codes (note "element type STRING") {}
```

New:
```stm
promo_codes list_of STRING (note "Applied promotion codes, may be empty")
```

No braces needed — the element type (`STRING`, `INT`, etc.) appears in the TYPE position. Machine-readable without metadata hacks.

#### Nested lists of records

```stm
line_items list_of record (filter item_status != "cancelled") {
  sku             STRING (required)
  quantity        INT
  discount_lines  list_of record (filter discount_type != "internal") {
    discount_code   STRING
    discount_amount DECIMAL(12,2)
  }
}
```

Nesting works the same as today — the body of a `list_of record` is a schema body.

### Mapping Declarations

#### Iterating over a list: `each`

Old:
```stm
Items[] -> items[] {
  .MATNR -> .materialNumber
  .MENGE -> .quantity
}
```

New:
```stm
each Items -> items {
  .MATNR -> .materialNumber
  .MENGE -> .quantity
}
```

`each` introduces a nested mapping block that iterates over a source list and produces corresponding target list elements. No `[]` needed — `each` makes the iteration explicit.

#### Referencing list fields in arrows

Old:
```stm
line_items[].sku -> sku { trim }
CartLines[].unit_price -> gross_merchandise_value { * CartLines[].quantity }
```

New — use dot syntax only:
```stm
line_items.sku -> sku { trim }
CartLines.unit_price -> gross_merchandise_value { * CartLines.quantity }
```

The `[]` is dropped. Dotted paths already unambiguously resolve through nested structures. When a path traverses a list, the iteration context is established by the enclosing `each` or `flatten` block, or is implicit from the source schema structure.

#### Flattening a list: `flatten`

Old:
```stm
mapping 'order lines' (flatten `Order.LineItems[]`) {
  Order.LineItems[].SKU -> sku
}
```

New:
```stm
flatten Order.LineItems -> order_line_facts_parquet {
  .SKU -> sku
  .Quantity -> quantity
}
```

`flatten` lifts each list element into its own output row. Inside the block, paths are relative to the flattened element (using `.` prefix). `flatten` can appear as a top-level construct within a mapping body, replacing the mapping-level metadata annotation.

### Grammar Summary

```ebnf
field_decl       = NAME [type_expr] ["(" metadata ")"] ["{" schema_body "}"] ;
type_expr        = IDENT ["(" params ")"]       (* e.g. STRING, DECIMAL(12,2) *)
                 | "record"                      (* single nested structure *)
                 | "list_of" IDENT ["(" params ")"]   (* scalar list *)
                 | "list_of" "record"            (* list of structured elements *)
                 ;
```

In mappings:
```ebnf
each_block       = "each" src_path "->" tgt_path ["(" metadata ")"] "{" arrow_decl* "}" ;
flatten_block    = "flatten" src_path "->" tgt_path ["(" metadata ")"] "{" arrow_decl* "}" ;
```

`[]` is removed from field paths entirely.

## Design Decisions

### Why `list_of` (underscore) not `list of` (two words)?

A single token is unambiguous in the grammar. Two separate tokens would require lookahead to distinguish `list` as a keyword from `list` as a field name. The underscore makes it one lexeme while remaining readable.

### Why keep `record` as a keyword in type position?

`record` signals "this field has subfields in braces." Without it, the parser can't distinguish a field with metadata-in-braces from a field with a nested body. `record` in the type position is the minimal disambiguation.

### Why not merge `each` and `flatten`?

They have different cardinality semantics:
- `each`: 1 source element -> 1 target element (preserves list structure)
- `flatten`: 1 source element -> 1 output row (explodes list into parent)

Making the distinction explicit in the keyword prevents ambiguity about output cardinality.

### What happens to `filter`?

`filter` stays in schema-level metadata on `list_of` declarations. It is a schema concern (which elements exist), not a mapping concern (how elements are transformed). The new syntax is:

```stm
line_items list_of record (filter item_status != "cancelled") {
  ...
}
```

### What about the `flatten` mapping-level annotation?

The old `mapping 'name' (flatten `list[]`)` metadata annotation is replaced by `flatten` blocks inside the mapping body. This is more flexible — a mapping can contain multiple `flatten` and `each` blocks.

## Migration

### Backward Compatibility

This is a breaking syntax change. There is no v1-to-v2 compatibility period — all examples, tests, and docs are updated atomically.

### Reserved Keywords

- `record` — remains reserved but moves from block-introducer to type keyword
- `list` — **removed as reserved keyword**, freed for use as a field name
- `list_of` — **new reserved keyword**
- `each` — **new reserved keyword** (mapping bodies only)
- `flatten` — **new reserved keyword** (mapping bodies only)

## Affected Files

### Specification & Documentation
- `SATSUMA-V2-SPEC.md` — sections 3.1-3.3, 4.x (mappings), keyword list, examples throughout
- `AI-AGENT-REFERENCE.md` — grammar notation, quick reference, examples
- `PROJECT-OVERVIEW.md` — if architecture section references syntax
- `docs/conventions-for-schema-formats/` — 12 convention files (marc21, x12-hipaa, icalendar, cobol-copybook, asn1, hl7, swift-mt, iso20022, fix-protocol, dicom, iso8583, icalendar) with 46 occurrences of old syntax
- `docs/data-modelling/datavault/link-inventory.stm` — 2 occurrences
- `docs/ast-mapping.md`, `docs/tree-sitter-ambiguities.md`, `docs/tree-sitter-precedence.md` — `[]` path references

### Examples (all `.stm` files with `record`/`list`/`[]`)
- `cobol-to-avro.stm` — 6 record blocks, 2 list blocks, 1 nested arrow with `[]`
- `db-to-db.stm` — record/list blocks
- `edi-to-json.stm` — 5 record blocks, 6 list blocks (3 with filter), heavy `[]` usage in arrows
- `filter-flatten-governance.stm` — 2 record blocks, 8 list blocks, `flatten` annotation, `[]` paths
- `protobuf-to-parquet.stm` — 1 record block, 2 list blocks, `[]` in arrows
- `sap-po-to-mfcs.stm` — 2 list blocks (1 with filter), `[]` paths, nested arrow
- `xml-to-parquet.stm` — 4 record blocks, 2 list blocks, `flatten` annotation, `[]` paths
- `lib/sfdc_fragments.stm` — 2 record blocks
- Namespace examples (`ns-merging.stm`, `ns-platform.stm`) — if they use nested structures

### Tree-sitter Grammar
- `tooling/tree-sitter-satsuma/grammar.js` — replace `record_block`/`list_block` rules, add `list_of`/`each`/`flatten` keywords, remove `[]` from paths
- `tooling/tree-sitter-satsuma/src/` — regenerated parser artifacts
- `tooling/tree-sitter-satsuma/test/corpus/` — update `schemas.txt`, `nested_arrows.txt`, `sap_po_patterns.txt`, `metadata.txt`, `namespaces.txt`, `recovery.txt`, and add new corpus tests for `list_of`/`each`/`flatten`

### CLI Tooling
- `tooling/satsuma-cli/src/extract.ts` — `record_block`/`list_block` handling, path `[]` logic
- `tooling/satsuma-cli/src/index-builder.ts` — field tree indexing
- `tooling/satsuma-cli/src/types.ts` — `isList` field
- `tooling/satsuma-cli/src/spread-expand.ts` — `[]` path generation
- `tooling/satsuma-cli/src/commands/schema.ts` — record/list display
- `tooling/satsuma-cli/src/commands/find.ts` — nested structure traversal
- `tooling/satsuma-cli/src/commands/where-used.ts` — spread traversal
- `tooling/satsuma-cli/src/commands/meta.ts` — metadata extraction
- `tooling/satsuma-cli/src/commands/nl.ts` — field declaration traversal
- `tooling/satsuma-cli/src/nl-extract.ts` — NL extraction from nested blocks
- `tooling/satsuma-cli/test/` — all test files referencing record/list/`[]`

### VS Code Extension
- `tooling/vscode-satsuma/syntaxes/satsuma.tmLanguage.json` — keyword highlighting, block matching, path patterns

## Success Criteria

1. Every field declaration in a schema follows `NAME TYPE (metadata) { body }` — no keyword-first blocks.
2. `list_of STRING` and `list_of INT` are machine-parseable scalar list types — no metadata workarounds.
3. `each` and `flatten` replace `[]` in all mapping arrows — no bracket syntax in paths.
4. All 16+ canonical examples parse without errors.
5. All CLI tests pass (currently 624).
6. All tree-sitter corpus tests pass (currently 226).
7. VS Code syntax highlighting correctly handles `record`, `list_of`, `each`, `flatten`.
8. Spec, agent reference, and all documentation are consistent with the new syntax.
