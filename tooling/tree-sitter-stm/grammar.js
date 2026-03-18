/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * STM v2 Grammar — Phase 4: Schema and fragment blocks
 *
 * Replaces opaque brace stubs in schema_block and fragment_block with a full
 * schema_body production covering field_decl, record_block, list_block,
 * fragment_spread, and note_block.
 *
 * Key design decisions:
 *   - type_expr is an atomic token (regex) that greedily consumes the base type
 *     name plus an immediately-adjacent parameter list, e.g. VARCHAR(255) or
 *     DECIMAL(12,2). This prevents ( ) from being ambiguously parsed as either
 *     type_params or metadata_block.
 *   - field_name uses choice(identifier, backtick_name) to support both bare and
 *     backtick-quoted field identifiers.
 *   - record and list are reserved keywords (appear as string literals in grammar)
 *     so they cannot be used as field names or block labels.
 *   - fragment_spread is "..." followed by block_label (identifier or quoted_name).
 *   - metadata conflict between key_value_pair and tag_token is declared in
 *     `conflicts` (inherited from Phase 3).
 */

module.exports = grammar({
  name: "stm",

  extras: ($) => [
    /[ \t\f\r\n]+/,
    $.warning_comment,
    $.question_comment,
    $.comment,
  ],

  word: ($) => $.identifier,

  conflicts: ($) => [
    // After seeing an identifier in _metadata_entry, need one more token
    // to decide between key_value_pair and tag_token.
    [$.key_value_pair, $.tag_token],
  ],

  rules: {
    // ── Top-level ─────────────────────────────────────────────────────────

    source_file: ($) => repeat($._top_level_item),

    _top_level_item: ($) =>
      choice(
        $.import_decl,
        $.note_block,
        $.schema_block,
        $.fragment_block,
        $.transform_block,
        $.mapping_block,
        $.metric_block,
      ),

    // ── Import ────────────────────────────────────────────────────────────

    import_decl: ($) =>
      seq(
        "import",
        "{",
        commaSep1($.import_name),
        "}",
        "from",
        $.import_path,
      ),

    import_name: ($) => $.quoted_name,

    import_path: ($) => $.nl_string,

    // ── Schema block ─────────────────────────────────────────────────────

    schema_block: ($) =>
      seq(
        "schema",
        $.block_label,
        optional($.metadata_block),
        "{",
        $.schema_body,
        "}",
      ),

    // ── Fragment block ────────────────────────────────────────────────────

    fragment_block: ($) =>
      seq(
        "fragment",
        $.block_label,
        "{",
        $.schema_body,
        "}",
      ),

    // ── Transform block (body still opaque — Phase 5) ─────────────────────

    transform_block: ($) =>
      seq(
        "transform",
        $.block_label,
        $._opaque_braces,
      ),

    // ── Mapping block (body still opaque — Phase 6) ───────────────────────

    mapping_block: ($) =>
      seq(
        "mapping",
        optional($.block_label),
        optional($.metadata_block),
        $._opaque_braces,
      ),

    // ── Metric block (body still opaque — Phase 7) ───────────────────────

    metric_block: ($) =>
      seq(
        "metric",
        $.block_label,
        optional($.nl_string),
        $.metadata_block,
        $._opaque_braces,
      ),

    // ── Note block (structural — top level and inside mapping/metric) ─────

    note_block: ($) =>
      seq(
        "note",
        "{",
        choice($.multiline_string, $.nl_string),
        "}",
      ),

    // ── Schema body ───────────────────────────────────────────────────────
    // Shared by schema_block, fragment_block, record_block, list_block.

    schema_body: ($) => repeat($._schema_body_item),

    _schema_body_item: ($) =>
      choice(
        $.field_decl,
        $.record_block,
        $.list_block,
        $.fragment_spread,
        $.note_block,
      ),

    // ── Field declaration ─────────────────────────────────────────────────
    // field_name  type_expr  (metadata_block)?

    field_decl: ($) =>
      seq(
        $.field_name,
        $.type_expr,
        optional($.metadata_block),
      ),

    // field_name: bare identifier or backtick-quoted (for special-char names).
    field_name: ($) => choice($.identifier, $.backtick_name),

    // type_expr: base type token with optional immediately-adjacent param list.
    // Written as a single lexical token to prevent ( ) ambiguity with metadata.
    // Examples: STRING, VARCHAR(255), DECIMAL(12,2), TIMESTAMPTZ, ARRAY(JSON)
    // Note: no space allowed between base type and opening paren.
    type_expr: (_) =>
      token(
        seq(
          /[a-zA-Z_][a-zA-Z0-9_-]*/,
          optional(seq("(", /[^)]*/, ")")),
        ),
      ),

    // ── Nested record and list blocks ─────────────────────────────────────
    // `record` and `list` are reserved keywords (string literals in grammar).

    record_block: ($) =>
      seq(
        "record",
        $.block_label,
        optional($.metadata_block),
        "{",
        $.schema_body,
        "}",
      ),

    list_block: ($) =>
      seq(
        "list",
        $.block_label,
        optional($.metadata_block),
        "{",
        $.schema_body,
        "}",
      ),

    // ── Fragment spread ───────────────────────────────────────────────────
    // ...identifier  or  ...'quoted name'

    fragment_spread: ($) => seq("...", $.block_label),

    // ── Block label ───────────────────────────────────────────────────────

    block_label: ($) => choice($.identifier, $.quoted_name),

    // ── Metadata block ────────────────────────────────────────────────────

    metadata_block: ($) =>
      seq(
        "(",
        optional(commaSep1($._metadata_entry)),
        optional(","),
        ")",
      ),

    _metadata_entry: ($) =>
      choice(
        $.enum_body,
        $.slice_body,
        $.note_tag,
        $.key_value_pair,
        $.tag_token,
      ),

    enum_body: ($) =>
      seq(
        "enum",
        "{",
        commaSep1($.identifier),
        optional(","),
        "}",
      ),

    slice_body: ($) =>
      seq(
        "slice",
        "{",
        commaSep1($.identifier),
        optional(","),
        "}",
      ),

    note_tag: ($) =>
      seq(
        "note",
        choice($.multiline_string, $.nl_string),
      ),

    key_value_pair: ($) => seq($.kv_key, $._kv_value),

    kv_key: (_) => /[a-zA-Z_][a-zA-Z0-9_-]*/,

    _kv_value: ($) =>
      choice(
        $.nl_string,
        $.multiline_string,
        $.backtick_name,
        $.identifier,
      ),

    tag_token: ($) => $.identifier,

    // ── Opaque balanced delimiters ────────────────────────────────────────
    // Used for block bodies not yet structured (transform, mapping, metric).

    _opaque_parens: ($) => seq("(", repeat($._paren_item), ")"),

    _paren_item: ($) =>
      choice(
        $._opaque_parens,
        $._opaque_braces,
        $.multiline_string,
        $.nl_string,
        $.quoted_name,
        $.backtick_name,
        /[^(){}"'`]+/,
      ),

    _opaque_braces: ($) => seq("{", repeat($._brace_item), "}"),

    _brace_item: ($) =>
      choice(
        $._opaque_braces,
        $._opaque_parens,
        $.multiline_string,
        $.nl_string,
        $.quoted_name,
        $.backtick_name,
        /[^(){}"'`]+/,
      ),

    // ── Lexical tokens ────────────────────────────────────────────────────

    identifier: (_) => /[a-zA-Z_][a-zA-Z0-9_-]*/,

    quoted_name: (_) => /'(?:[^'\\]|\\.)*'/,

    backtick_name: (_) => /`(?:[^`\\]|\\.)*`/,

    multiline_string: (_) => token(prec(1, /"""[^"]*"""/)),

    nl_string: (_) => /"(?:[^"\\]|\\.)*"/,

    warning_comment: (_) => token(prec(3, /\/\/!.*/)),
    question_comment: (_) => token(prec(2, /\/\/\?.*/)),
    comment: (_) => token(prec(1, /\/\/.*/)),
  },
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}
