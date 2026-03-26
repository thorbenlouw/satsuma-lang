; ── Satsuma v2 Syntax Highlighting ──────────────────────────────────────────────
; queries/highlights.scm

; ── Structural keywords ───────────────────────────────────────────────────────
[
  "schema"
  "fragment"
  "mapping"
  "transform"
  "metric"
  "namespace"
  "note"
  "record"
  "list_of"
  "each"
  "flatten"
] @keyword

[
  "import"
  "from"
] @keyword.import

[
  "source"
  "target"
] @keyword.context

[
  "map"
  "enum"
  "slice"
] @keyword.operator

[
  "null"
  "default"
] @constant.builtin

; ── Operators and punctuation ─────────────────────────────────────────────────
[
  "->"
  "|"
  "..."
  "::"
] @operator

[
  "("
  ")"
  "{"
  "}"
] @punctuation.bracket

[
  ","
  ":"
] @punctuation.delimiter

; ── Block labels ──────────────────────────────────────────────────────────────
; Bare identifier label (e.g. `schema customers`)
(schema_block (block_label (identifier)) @type.definition)
(fragment_block (block_label (identifier)) @type.definition)
(transform_block (block_label (identifier)) @function.definition)
(mapping_block (block_label (identifier)) @function.definition)
(metric_block (block_label (identifier)) @type.definition)
(namespace_block name: (identifier) @module)
; Quoted label (e.g. `schema 'order-headers'`)
(schema_block (block_label (quoted_name)) @type.definition)
(fragment_block (block_label (quoted_name)) @type.definition)
(transform_block (block_label (quoted_name)) @function.definition)
(mapping_block (block_label (quoted_name)) @function.definition)
(metric_block (block_label (quoted_name)) @type.definition)

; Metric display name string (the "MRR" label)
(metric_block (nl_string) @string.special)

; ── Field declarations ────────────────────────────────────────────────────────
(field_decl
  (field_name (identifier) @variable.field))

(field_decl
  (field_name (backtick_name) @variable.field))

(field_decl
  (type_expr) @type)

; ── Metadata tokens ───────────────────────────────────────────────────────────
(tag_token) @attribute

(tag_with_value
  (identifier) @attribute)

; Enum/slice body identifiers (the enum values themselves)
(enum_body (identifier) @constant)
(slice_body (identifier) @constant)

; ── Arrow paths ───────────────────────────────────────────────────────────────
(src_path) @variable
(tgt_path) @variable

(namespaced_path (identifier) @module "::" @operator)
(field_path (identifier) @variable)
(relative_field_path (identifier) @variable)
(backtick_path (backtick_name) @variable)

; ── Backtick names (field names and references) ───────────────────────────────
(backtick_name) @string.special

; ── Pipe chain tokens ─────────────────────────────────────────────────────────
(pipe_text (identifier) @function.call)

; ── Map literal ───────────────────────────────────────────────────────────────
(map_key (identifier) @constant)
(map_key (nl_string) @string)
(map_value (identifier) @constant)
(map_value (nl_string) @string)
(map_value (nl_string) @string)

; Wildcard and special map keys
(map_key) @constant.builtin  ; catches "_", "null", "default" nodes

; ── Import paths ──────────────────────────────────────────────────────────────
; ── Qualified names (ns::name) ──────────────────────────────────────────────
(qualified_name (identifier) @module "::" @operator)

(import_name (quoted_name) @string.special)
(import_name (identifier) @variable)
(import_path (nl_string) @string.path)

; ── Strings ───────────────────────────────────────────────────────────────────
(nl_string) @string
(multiline_string) @string.multiline
(quoted_name) @string.special

; ── Comments ─────────────────────────────────────────────────────────────────
; Order: most-specific first. //! and //? get distinct highlight groups so
; editors can visually distinguish warnings from questions from plain comments.
(warning_comment) @comment.warning    ; //! — known issue, surfaced by linter
(question_comment) @comment.question  ; //? — open question/TODO
(comment) @comment                    ; // — regular author comment

; ── Fragment spread ───────────────────────────────────────────────────────────
(fragment_spread
  (spread_label (qualified_name) @type))
(fragment_spread
  (spread_label (identifier) @type))
(fragment_spread
  (spread_label (quoted_name) @type))
