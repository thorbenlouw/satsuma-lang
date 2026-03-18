/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * STM v2 Grammar — Phase 6: Mapping blocks
 *
 * Adds structured parsing for mapping blocks:
 *   mapping <name>? (<metadata>)? {
 *     source { <source_entries> }
 *     target { <target_entry> }
 *     <note_block | arrow_decl>*
 *   }
 *
 * Arrow types:
 *   map_arrow      src_path -> tgt_path (metadata)? transform_body?
 *   computed_arrow -> tgt_path (metadata)? transform_body?
 *   nested_arrow   src_path -> tgt_path (metadata)? { arrow_decl* }
 *
 * Path types: field_path (a.b.c), relative_field_path (.field),
 *   backtick_path (`Foo`.bar), namespaced_path (ns::schema.field),
 *   all with optional [] suffix.
 *
 * Pipe_chain from Phase 5 is reused for transform bodies.
 *
 * GLR conflicts declared:
 *   - map_arrow vs nested_arrow (both start with src_path -> tgt_path;
 *     distinguished by body: pipe_chain vs arrow_decl list)
 *   - namespaced_path vs field_path (both start with identifier; ::  vs
 *     . or -> determines which)
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
    // Metadata: key_value_pair vs tag_token (Phase 3)
    [$.key_value_pair, $.tag_token],
    // Arrow body: map_arrow body may be { pipe_chain } or absent;
    // nested_arrow body is always { arrow_decl* }. Both start with the same
    // src_path -> tgt_path prefix. GLR resolves on body content.
    [$.map_arrow, $.nested_arrow],
    // Path: namespaced_path and field_path both start with identifier.
    // Resolved on next token: :: vs . or ->
    [$.namespaced_path, $.field_path],
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

    // ── Schema block ──────────────────────────────────────────────────────

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

    // ── Transform block ───────────────────────────────────────────────────

    transform_block: ($) =>
      seq(
        "transform",
        $.block_label,
        "{",
        optional($.pipe_chain),
        "}",
      ),

    // ── Mapping block (Phase 6) ───────────────────────────────────────────

    mapping_block: ($) =>
      seq(
        "mapping",
        optional($.block_label),
        optional($.metadata_block),
        "{",
        $.mapping_body,
        "}",
      ),

    mapping_body: ($) =>
      seq(
        $.source_block,
        $.target_block,
        repeat($._mapping_body_item),
      ),

    _mapping_body_item: ($) => choice($.note_block, $._arrow_decl),

    // source { ref1, ref2 } or source { ref1 ref2 } or source { "join ..." }
    source_block: ($) =>
      seq(
        "source",
        "{",
        commaSep1($._source_entry),
        optional(","),
        "}",
      ),

    _source_entry: ($) => choice($.backtick_name, $.identifier, $.nl_string),

    // target { ref }
    target_block: ($) =>
      seq(
        "target",
        "{",
        $._source_entry,
        "}",
      ),

    // ── Metric block ──────────────────────────────────────────────────────

    metric_block: ($) =>
      seq(
        "metric",
        $.block_label,
        optional($.nl_string),
        $.metadata_block,
        "{",
        $.metric_body,
        "}",
      ),

    // ── Note block ────────────────────────────────────────────────────────

    note_block: ($) =>
      seq(
        "note",
        "{",
        choice($.multiline_string, $.nl_string),
        "}",
      ),

    // ── Schema body ───────────────────────────────────────────────────────

    schema_body: ($) => repeat($._schema_body_item),

    _schema_body_item: ($) =>
      choice(
        $.field_decl,
        $.record_block,
        $.list_block,
        $.fragment_spread,
        $.note_block,
      ),

    // ── Metric body ───────────────────────────────────────────────────────

    metric_body: ($) => repeat($._metric_body_item),

    _metric_body_item: ($) => choice($.field_decl, $.note_block),

    // ── Field declaration ─────────────────────────────────────────────────

    field_decl: ($) =>
      seq(
        $.field_name,
        $.type_expr,
        optional($.metadata_block),
      ),

    field_name: ($) => choice($.identifier, $.backtick_name),

    type_expr: (_) =>
      token(
        seq(
          /[a-zA-Z_][a-zA-Z0-9_-]*/,
          optional(seq("(", /[^)]*/, ")")),
        ),
      ),

    // ── Nested record and list blocks ─────────────────────────────────────

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

    fragment_spread: ($) => seq("...", $.block_label),

    // ── Arrow declarations ────────────────────────────────────────────────
    // Three arrow types share src_path -> tgt_path prefix.
    // computed_arrow omits src_path (starts directly with ->).
    // nested_arrow body contains arrow_decls; map_arrow body contains pipe_chain.

    _arrow_decl: ($) =>
      choice(
        $.computed_arrow,
        $.nested_arrow,
        $.map_arrow,
      ),

    // -> tgt_path (metadata)? { pipe_chain }?
    computed_arrow: ($) =>
      seq(
        "->",
        $.tgt_path,
        optional($.metadata_block),
        optional($._arrow_transform_body),
      ),

    // src_path -> tgt_path (metadata)? { arrow_decl* }
    nested_arrow: ($) =>
      seq(
        $.src_path,
        "->",
        $.tgt_path,
        optional($.metadata_block),
        "{",
        repeat($._arrow_decl),
        "}",
      ),

    // src_path -> tgt_path (metadata)? { pipe_chain }?
    map_arrow: ($) =>
      seq(
        $.src_path,
        "->",
        $.tgt_path,
        optional($.metadata_block),
        optional($._arrow_transform_body),
      ),

    // { pipe_chain } transform body on an arrow
    _arrow_transform_body: ($) => seq("{", $.pipe_chain, "}"),

    // ── Arrow paths ───────────────────────────────────────────────────────
    // src_path and tgt_path are named wrapper nodes.

    src_path: ($) => $._path_expr,
    tgt_path: ($) => $._path_expr,

    _path_expr: ($) =>
      choice(
        $.namespaced_path,
        $.backtick_path,
        $.relative_field_path,
        $.field_path,
      ),

    // ns::identifier or ns::identifier.field... (optional [])
    namespaced_path: ($) =>
      seq(
        $.identifier,
        "::",
        $.identifier,
        repeat(seq(".", $._path_seg)),
        optional("[]"),
      ),

    // `BacktickRef` or `BacktickRef`.field... (optional [])
    backtick_path: ($) =>
      seq(
        $.backtick_name,
        repeat(seq(".", $._path_seg)),
        optional("[]"),
      ),

    // .field or .field.nested... (no [] suffix for relative paths)
    relative_field_path: ($) =>
      seq(
        ".",
        $._path_seg,
        repeat(seq(".", $._path_seg)),
      ),

    // field or field.nested... (optional [])
    field_path: ($) =>
      seq(
        $.identifier,
        repeat(seq(".", $._path_seg)),
        optional("[]"),
      ),

    _path_seg: ($) => choice($.identifier, $.backtick_name),

    // ── Pipe chain (transform, arrow bodies) ─────────────────────────────

    pipe_chain: ($) => seq($.pipe_step, repeat(seq("|", $.pipe_step))),

    pipe_step: ($) =>
      choice(
        $.multiline_string,
        $.nl_string,
        $.token_call,
        $.map_literal,
        $.fragment_spread,
      ),

    token_call: ($) =>
      seq(
        $.identifier,
        optional(seq("(", optional(commaSep1($._tc_arg)), ")")),
      ),

    _tc_arg: ($) => choice($.nl_string, $.identifier, /[0-9]+/),

    // ── Map literal ───────────────────────────────────────────────────────

    map_literal: ($) => seq("map", "{", repeat($.map_entry), "}"),

    map_entry: ($) => seq($.map_key, ":", $.map_value),

    map_key: ($) =>
      choice(
        $.identifier,
        $.nl_string,
        /[0-9]+/,
        "_",
        "null",
        "default",
        seq($._comparison_op, $._map_scalar),
      ),

    _comparison_op: (_) =>
      token(choice(">=", "<=", ">", "<", "!=", "==")),

    _map_scalar: ($) => choice($.identifier, /[0-9]+/, $.nl_string),

    map_value: ($) =>
      choice($.nl_string, $.multiline_string, $.identifier, /[0-9]+/, "null"),

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
