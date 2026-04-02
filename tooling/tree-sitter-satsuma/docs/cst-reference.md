# Satsuma v2 CST Reference

This document describes the concrete syntax tree (CST) produced by the `tree-sitter-satsuma` v2 grammar. It is the authoritative reference for tool authors querying the CST.

---

## Top-level Structure

```
source_file
  import_decl*
  (schema_block | fragment_block | transform_block | mapping_block | note_block)*
```

> **Note:** Metric schemas are `schema_block` nodes whose `metadata_block` contains a bare `metric` `tag_token`. There is no separate `metric_block` node type in v2.

---

## Node Types

### `source_file`
Root node. Contains zero or more top-level items.

---

### `import_decl`
```
import { 'name', 'other name' } from "path/to/file.stm"
```
Children:
- `import_name` (one or more) — single-quoted names
- `import_path` — double-quoted file path

---

### `schema_block`
```
schema <block_label> (<metadata_block>)? { <schema_body> }
```
Children:
- `block_label`
- `metadata_block` (optional)
- `schema_body` — contains `field_decl`, `record_block`, `list_block`, `fragment_spread`, `note_block`

---

### `fragment_block`
```
fragment <block_label> { <schema_body> }
```
Same body grammar as `schema_block`. No metadata block on the keyword itself.

---

### `record_block` / `list_block`
Nested inside `schema_body`. Same body grammar as `schema_block`. Recursive.

---

### `field_decl`
```
<field_name>  <type_expr>  (<metadata_block>)?
```
Children:
- `field_name` — bare identifier or backtick-quoted
- `type_expr` — base type token + optional `(param, ...)` list
- `metadata_block` (optional)

---

### `fragment_spread`
```
...identifier
...'quoted name'
```

---

### `transform_block`
```
transform <block_label> { <pipe_chain> }
```
Children:
- `block_label`
- `pipe_chain`

---

### `mapping_block`
```
mapping <block_label>? (<metadata_block>)? {
  source { <source_body> }
  target { <target_body> }
  <note_block>?
  <arrow_decl>*
}
```
Children:
- `block_label` (optional)
- `metadata_block` (optional)
- `source_block`
- `target_block`
- `note_block` (optional)
- `map_arrow | computed_arrow | nested_arrow` (zero or more)

---

### `map_arrow`
```
src_path -> tgt_path (<metadata_block>)? { pipe_chain }?
```

### `computed_arrow`
```
-> tgt_path (<metadata_block>)? { pipe_chain }?
```

### `nested_arrow`
```
src_path[] -> tgt_path[] (<metadata_block>)? { arrow_decl* }
```

---

### `pipe_chain`
```
pipe_step ("|" pipe_step)*
```
Each `pipe_step` is one of:
- `nl_string` — `"..."` or `"""..."""`
- `token_call` — identifier with optional `(args)`
- `map_literal` — `map { map_entry* }`
- `fragment_spread` — `...name`

---

### `map_literal` / `map_entry`
```
map { map_key: map_value, ... }
```
`map_key` may be: token, string, number, comparison operator + value, `null`, `default`, or `_` (wildcard).

---

### Metric schemas (v2)

In v2, metrics are `schema_block` nodes whose `metadata_block` contains a bare
`metric` `tag_token`. Use `isMetricSchema(node.childForFieldName("metadata_block"))` from
`@satsuma/core` to detect them.

```
schema <block_label> (metric, metric_name "<display>", source <ref>, grain <ident>, ...) {
  <schema_body>
}
```
Children are the same as `schema_block`. Metric-specific metadata tags:
- `metric` — bare `tag_token` marking the block as a metric
- `metric_name` — `tag_with_value` carrying the human-readable display name
- `source` — `tag_with_value` with source schema reference(s)
- `grain` — `tag_with_value` with aggregation grain identifier
- `slice` — `slice_body` with dimension identifiers
- `filter` — `tag_with_value` with filter string literal

---

### `note_block`
```
note { "string" }
note { """...""" }
```
Children:
- `string_literal` or `multiline_string`

---

### `metadata_block`
Comma-separated list of `tag_token` and `key_value_pair` nodes inside `( )`.

### `tag_token`
A bare identifier token used as a flag (e.g. `pii`, `pk`, `required`).

### `key_value_pair`
```
key value
```
Children:
- `kv_key` — identifier
- `kv_value` — string, identifier, path, or brace-enclosed token list

---

### `block_label`
Bare identifier or single-quoted string after a block keyword.

### `field_name`
Bare identifier or backtick-quoted identifier for field declarations.

### `backtick_ref`
Backtick-quoted identifier used in source/target bodies and paths.

---

## Comment Node Types

| Node | Syntax | Purpose |
|------|--------|---------|
| `comment` | `// ...` | Regular comment — stripped by tooling |
| `warning_comment` | `//! ...` | Known issue/risk — surfaced by linter |
| `question_comment` | `//? ...` | Open question/TODO — surfaced by linter |

---

## Path Node Types

| Node | Example |
|------|---------|
| `field_path` | `order.customer_id` |
| `relative_field_path` | `.status` |
| `array_path` | `items[]` |
| `backtick_path` | `` `Lead_Source__c`.value `` |

---

## Example Queries (tree-sitter query syntax)

```scheme
; All schema names
(schema_block (block_label) @schema.name)

; All fields with pii tag
(field_decl
  (field_name) @field.name
  (metadata_block (tag_token) @tag (#eq? @tag "pii")))

; All warning comments
(warning_comment) @warning

; All metric schemas (schema blocks with the metric tag)
(schema_block
  (block_label) @metric.name
  (metadata_block (tag_token) @tag (#eq? @tag "metric")))
```
