/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * STM v2 Grammar — Phases 5 and 7: Transform and metric blocks
 *
 * Phase 5 — transform blocks:
 *   transform_block body is a pipe_chain (shared with arrow transform bodies in
 *   Phase 6). pipe_chain is a "|"-separated sequence of pipe_steps, where each
 *   step is an nl_string, multiline_string, token_call, map_literal, or
 *   fragment_spread.
 *
 * Phase 7 — metric blocks:
 *   metric_block body (metric_body) is a sequence of field_decl and note_block.
 *   Reuses the field_decl production from Phase 4. metric_block is distinct from
 *   schema_block by keyword, required metadata_block, optional display name, and
 *   metric_body node type.
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
    // key_value_pair vs tag_token in metadata (Phase 3)
    [$.key_value_pair, $.tag_token],
    // token_call vs fragment_spread both valid as first pipe_step; parser needs
    // one more token to distinguish identifier (token_call) from ... (spread).
    // Actually these start differently so no conflict — kept for clarity.
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

    // ── Transform block (Phase 5) ─────────────────────────────────────────
    // Body is a pipe_chain (shared with arrow transform bodies in Phase 6).

    transform_block: ($) =>
      seq(
        "transform",
        $.block_label,
        "{",
        optional($.pipe_chain),
        "}",
      ),

    // ── Mapping block (body still opaque — Phase 6) ───────────────────────

    mapping_block: ($) =>
      seq(
        "mapping",
        optional($.block_label),
        optional($.metadata_block),
        $._opaque_braces,
      ),

    // ── Metric block (Phase 7) ────────────────────────────────────────────
    // Distinct from schema_block: starts with "metric" keyword, requires
    // metadata_block (not optional), optional display name, and uses metric_body.

    metric_block: ($) =>
      seq(
        "metric",
        $.block_label,
        optional($.nl_string), // optional display label e.g. "MRR"
        $.metadata_block, // required: (source X, grain monthly, ...)
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

    // ── Schema body (schema_block, fragment_block, record_block, list_block)

    schema_body: ($) => repeat($._schema_body_item),

    _schema_body_item: ($) =>
      choice(
        $.field_decl,
        $.record_block,
        $.list_block,
        $.fragment_spread,
        $.note_block,
      ),

    // ── Metric body (metric_block) ────────────────────────────────────────

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

    // ── Pipe chain (shared: transform body + arrow transform bodies) ──────
    // pipe_chain ::= pipe_step ("|" pipe_step)*

    pipe_chain: ($) => seq($.pipe_step, repeat(seq("|", $.pipe_step))),

    pipe_step: ($) =>
      choice(
        $.multiline_string,
        $.nl_string,
        $.token_call,
        $.map_literal,
        $.fragment_spread,
      ),

    // token_call: identifier with optional argument list.
    // Examples: trim, lowercase, validate_email, coalesce("", null)
    token_call: ($) =>
      seq(
        $.identifier,
        optional(seq("(", optional(commaSep1($._tc_arg)), ")")),
      ),

    _tc_arg: ($) => choice($.nl_string, $.identifier, /[0-9]+/),

    // ── Map literal ───────────────────────────────────────────────────────
    // map { K: V, K: V, _: "fallback" }
    // "map" is a reserved keyword so map_literal is unambiguous.

    map_literal: ($) =>
      seq("map", "{", repeat($.map_entry), "}"),

    map_entry: ($) =>
      seq($.map_key, ":", $.map_value),

    // Map keys: token, string, number, wildcard, null, default, or comparison.
    map_key: ($) =>
      choice(
        $.identifier,
        $.nl_string,
        /[0-9]+/,
        "_", // wildcard catch-all
        "null",
        "default",
        seq($._comparison_op, $._map_scalar),
      ),

    _comparison_op: (_) =>
      token(choice(">=", "<=", ">", "<", "!=", "==")),

    _map_scalar: ($) => choice($.identifier, /[0-9]+/, $.nl_string),

    // Map values: string, identifier, number, or null.
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

    // ── Opaque balanced delimiters (mapping body — Phase 6) ───────────────

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
