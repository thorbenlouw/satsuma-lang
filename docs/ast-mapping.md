# STM CST To AST Mapping

## Purpose

The Tree-sitter grammar should produce a concrete syntax tree that preserves STM
syntax faithfully while making semantic AST construction straightforward. The
parser should not emit a semantic AST directly; downstream tooling should build
that layer from CST nodes without reparsing raw text.

## Principles

- Preserve source order for all declarations and block members.
- Use explicit node names for syntax that downstream tools care about.
- Keep comments and notes structurally recoverable.
- Preserve path segment boundaries, array markers, and relative prefixes.
- Separate syntax-preserving nodes from semantic grouping done later in the AST.

## Canonical CST Node Inventory

Top-level nodes:

- `source_file`
- `namespace_decl`
- `workspace_block`
- `import_declaration`
- `integration_block`
- `schema_block`
- `fragment_block`
- `mapping_block`

Schema and integration body nodes:

- `integration_field`
- `field_declaration`
- `group_declaration`
- `array_group_declaration`
- `primitive_array_field`
- `fragment_spread`
- `tag_list`
- `tag`
- `tag_value`
- `enum_value_set`
- `annotation`
- `note_block`
- `comment`

Namespace and workspace nodes:

- `namespace_decl` — children: `string_literal` (the namespace value)
- `workspace_block` — children: `string_literal` (workspace name), `workspace_entry`*, `note_block`*, `comment`*
- `workspace_entry` — children: `string_literal` (namespace), `string_literal` (file path)

Mapping nodes:

- `map_header`
- `map_option`
- `map_entry`
- `computed_map_entry`
- `nested_map`
- `transform_clause`
- `pipe_step`
- `when_clause`
- `else_clause`
- `fallback_clause`
- `source_path`
- `target_path`
- `namespaced_path` — children: optional `ns_qualifier`, `identifier`, zero or more `.identifier` segments
- `ns_qualifier` — children: `identifier`, `namespace_separator` (`::`)

Expression and lexical support nodes:

- `identifier`
- `quoted_identifier`
- `string_literal`
- `multiline_string`
- `number_literal`
- `boolean_literal`
- `null_literal`
- `call_expression`
- `map_literal`
- `binary_condition`

## Syntax-Preserving Versus Semantic Nodes

Syntax-preserving CST nodes should remain explicit even if downstream AST nodes
later collapse them:

- `tag_list` and `annotation` remain separate because tooling needs original
  placement and formatting context.
- `note_block` remains distinct from comments because notes are block-level
  markdown content, not line comments.
- `transform_clause`, `when_clause`, `else_clause`, and `fallback_clause`
  remain separate to preserve multiline continuation structure.

The AST layer can later normalize these into fewer node types:

- top-level declarations become statements with `kind`
- fields and groups become structured members
- transform continuations become ordered semantic clauses
- comments become attachments with severity and placement

## Comment And Note Attachment Strategy

Comments should parse as explicit nodes rather than disappear into `extras`.

Rationale:

- STM comment prefixes carry severity (`//`, `//!`, `//?`).
- Downstream tools need byte ranges for diagnostics and rendering.
- Attachment decisions are semantic and should happen after parse.

Attachment rules for the AST layer:

- trailing comments attach to the same declaration or mapping entry line
- standalone comments attach to the next declaration when adjacent, otherwise to
  the containing block
- `note_block` attaches only to the declaration or block that syntactically owns
  it; it should never be inferred heuristically

## Path Representation

CST:

- `source_path` and `target_path` own ordered `path_segment` children
- each segment preserves:
  - raw token text
  - whether it was quoted
  - whether it is an array segment (`[]`)
- relative paths preserve an explicit leading-relative marker on the path node
- namespace-qualified paths have an `ns_qualifier` child before the first segment

Recommended AST representation for a plain path:

```json
{
  "kind": "path",
  "role": "source",
  "isRelative": true,
  "segments": [
    { "name": "items", "quoted": false, "isArray": true },
    { "name": "sku", "quoted": false, "isArray": false }
  ]
}
```

Recommended AST representation for a namespace-qualified path (`crm::orders.order_id`):

```json
{
  "kind": "path",
  "role": "source",
  "namespace": "crm",
  "isRelative": false,
  "segments": [
    { "name": "orders", "quoted": false, "isArray": false },
    { "name": "order_id", "quoted": false, "isArray": false }
  ]
}
```

The `namespace` field is `null` (or absent) for unqualified paths. Downstream tools should treat `crm::orders` and `orders` as distinct schemas when a namespace qualifier is present.

## Transform Representation

The CST should preserve the transform head and each continuation line as
independent nodes. The AST layer can group them into ordered clauses.

Recommended AST shape:

```json
{
  "kind": "transform",
  "clauses": [
    { "kind": "pipe", "steps": ["trim", "lowercase"] },
    { "kind": "when", "condition": "x == 1", "value": "\"one\"" },
    { "kind": "else", "value": "\"other\"" },
    { "kind": "fallback", "path": ".backup" }
  ]
}
```

## Example Coverage Check

The planned node inventory is grounded in the current example corpus:

- [`examples/db-to-db.stm`](/Users/thorben/dev/personal/stm/examples/db-to-db.stm): schema fields, tags, mapping entries, pipelines, warnings
- [`examples/edi-to-json.stm`](/Users/thorben/dev/personal/stm/examples/edi-to-json.stm): annotations, nested groups, array mappings, conditional logic
- [`examples/xml-to-parquet.stm`](/Users/thorben/dev/personal/stm/examples/xml-to-parquet.stm): path-heavy mappings, nested data, notes
- [`examples/multi-source-hub.stm`](/Users/thorben/dev/personal/stm/examples/multi-source-hub.stm): imports, multiple schemas, shared fragments
- [`examples/protobuf-to-parquet.stm`](/Users/thorben/dev/personal/stm/examples/protobuf-to-parquet.stm): message/event-style structures and field options

Multi-schema namespace and workspace node types are covered by:

- [`features/02-multi-schema/examples/namespace-basic.stm`](/Users/thorben/dev/personal/stm/features/02-multi-schema/examples/namespace-basic.stm): `namespace_decl`, same-namespace `::` mapping header
- [`features/02-multi-schema/examples/crm/pipeline.stm`](/Users/thorben/dev/personal/stm/features/02-multi-schema/examples/crm/pipeline.stm): `namespace_decl` with schemas
- [`features/02-multi-schema/examples/billing/pipeline.stm`](/Users/thorben/dev/personal/stm/features/02-multi-schema/examples/billing/pipeline.stm): colliding schema name resolved by namespace
- [`features/02-multi-schema/examples/warehouse/ingest.stm`](/Users/thorben/dev/personal/stm/features/02-multi-schema/examples/warehouse/ingest.stm): cross-namespace mapping headers (`namespaced_path`, `ns_qualifier`), cross-namespace field references
- [`features/02-multi-schema/examples/platform.stm`](/Users/thorben/dev/personal/stm/features/02-multi-schema/examples/platform.stm): `workspace_block`, `workspace_entry` nodes
