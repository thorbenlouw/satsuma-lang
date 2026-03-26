/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * Satsuma v2 Grammar — Phase 8: Unified field syntax
 *
 * Replaces keyword-first record/list blocks with name-first unified fields:
 *   NAME record (metadata)? { schema_body }
 *   NAME list_of record (metadata)? { schema_body }
 *   NAME list_of TYPE (metadata)?
 *
 * Adds each/flatten blocks in mapping bodies:
 *   each src -> tgt (metadata)? { arrow_decl* }
 *   flatten src -> tgt (metadata)? { arrow_decl* }
 *
 * Removes [] from all field paths — iteration context is established by
 * each/flatten blocks or is implicit from the schema structure.
 *
 * GLR conflicts declared:
 *   - map_arrow vs nested_arrow (both start with src_path -> tgt_path)
 *   - namespaced_path vs field_path (both start with identifier; :: vs .)
 *   - namespace_block vs field_path/namespaced_path (identifier followed by
 *     :: or { could be a namespace block or a path — resolved by context)
 *   - field_decl ambiguity: identifier can start a field_decl (name) or a
 *     type_expr / spread — resolved by GLR + prec
 */

module.exports = grammar({
  name: "satsuma",

  extras: ($) => [
    /[ \t\f\r\n]+/,
    $.warning_comment,
    $.question_comment,
    $.comment,
  ],

  word: ($) => $.identifier,

  conflicts: ($) => [
    // Multi-word spread: after "...identifier", the next identifier could
    // continue the spread label or start a new field_decl.  GLR explores
    // both; prec.dynamic(-1) on _spread_words ensures field_decl wins
    // when it produces a valid parse.
    [$._spread_words],
  ],

  rules: {
    // ── Top-level ─────────────────────────────────────────────────────────

    source_file: ($) => repeat($._top_level_item),

    _top_level_item: ($) =>
      choice(
        $.import_decl,
        $.note_block,
        $.namespace_block,
        $.schema_block,
        $.fragment_block,
        $.transform_block,
        $.mapping_block,
        $.metric_block,
      ),

    // ── Namespace block ──────────────────────────────────────────────────
    // Flat (non-nestable) namespace: namespace <name> (<metadata>)? { <defs> }

    namespace_block: ($) =>
      seq(
        "namespace",
        field("name", $.identifier),
        optional($.metadata_block),
        "{",
        repeat($._namespace_item),
        "}",
      ),

    _namespace_item: ($) =>
      choice(
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

    import_name: ($) => choice($.qualified_name, $.quoted_name, $.identifier),

    // ns::identifier — used in imports
    qualified_name: ($) => seq($.identifier, "::", $.identifier),

    import_path: ($) => $.nl_string,

    // ── Schema block ──────────────────────────────────────────────────────

    schema_block: ($) =>
      seq(
        "schema",
        $.block_label,
        optional($.metadata_block),
        "{",
        optional($.schema_body),
        "}",
      ),

    // ── Fragment block ────────────────────────────────────────────────────

    fragment_block: ($) =>
      seq(
        "fragment",
        $.block_label,
        "{",
        optional($.schema_body),
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

    // ── Mapping block ───────────────────────────────────────────────────

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
      repeat1($._mapping_body_item),

    _mapping_body_item: ($) =>
      choice(
        $.note_block,
        $.source_block,
        $.target_block,
        $.each_block,
        $.flatten_block,
        $._arrow_decl,
      ),

    // source { ref1, ref2 } or source { ref1 ref2 } or source { "join ..." }
    source_block: ($) =>
      seq(
        "source",
        "{",
        repeat1(seq($._source_entry, optional(","))),
        "}",
      ),

    _source_entry: ($) => $.source_ref,

    source_ref: ($) =>
      seq(
        choice($.qualified_name, $.backtick_name, $.identifier, $.nl_string),
        optional($.metadata_block),
      ),

    // target { ref }
    target_block: ($) =>
      seq(
        "target",
        "{",
        $._source_entry,
        "}",
      ),

    // ── each/flatten blocks ─────────────────────────────────────────────
    // each src_path -> tgt_path (metadata)? { arrow_decl* }
    // flatten src_path -> tgt_path (metadata)? { arrow_decl* }

    each_block: ($) =>
      seq(
        "each",
        $.src_path,
        "->",
        $.tgt_path,
        optional($.metadata_block),
        "{",
        repeat($._arrow_decl),
        "}",
      ),

    flatten_block: ($) =>
      seq(
        "flatten",
        $.src_path,
        "->",
        $.tgt_path,
        optional($.metadata_block),
        "{",
        repeat($._arrow_decl),
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
        optional($.metric_body),
        "}",
      ),

    // ── Note block ────────────────────────────────────────────────────────

    note_block: ($) =>
      seq(
        "note",
        "{",
        choice($.multiline_string, repeat1($.nl_string)),
        "}",
      ),

    // ── Schema body ───────────────────────────────────────────────────────

    schema_body: ($) => repeat1($._schema_body_item),

    _schema_body_item: ($) =>
      choice(
        $.field_decl,
        $.fragment_spread,
        $.note_block,
      ),

    // ── Metric body ───────────────────────────────────────────────────────

    metric_body: ($) => repeat1($._metric_body_item),

    _metric_body_item: ($) => choice($.field_decl, $.note_block),

    // ── Field declaration (unified syntax) ──────────────────────────────
    // All fields follow: NAME [TYPE] [(metadata)] [{schema_body}]
    //
    // TYPE can be:
    //   - a scalar type: STRING, DECIMAL(12,2), etc. (type_expr token)
    //   - record: single nested structure
    //   - list_of record: list of structured elements
    //   - list_of TYPE: scalar list (list_of STRING, list_of INT, etc.)

    field_decl: ($) =>
      choice(
        // NAME record (metadata)? { schema_body }
        $._record_field,
        // NAME list_of record (metadata)? { schema_body }
        $._list_of_record_field,
        // NAME list_of TYPE (metadata)?
        $._list_of_scalar_field,
        // NAME TYPE (metadata)?  — original scalar field
        $._scalar_field,
      ),

    _scalar_field: ($) =>
      seq(
        $.field_name,
        $.type_expr,
        optional($.metadata_block),
      ),

    _record_field: ($) =>
      seq(
        $.field_name,
        "record",
        optional($.metadata_block),
        "{",
        optional($.schema_body),
        "}",
      ),

    _list_of_record_field: ($) =>
      seq(
        $.field_name,
        "list_of",
        "record",
        optional($.metadata_block),
        "{",
        optional($.schema_body),
        "}",
      ),

    _list_of_scalar_field: ($) =>
      seq(
        $.field_name,
        "list_of",
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

    // ── Fragment spread ───────────────────────────────────────────────────

    fragment_spread: ($) => seq("...", $.spread_label),

    // Multi-word spreads: ...audit fields, ...to utc date
    // Qualified spreads: ...ns::fragment_name
    // The spread consumes identifiers until it hits a token that cannot be
    // part of a label (newline-sensitive in practice; the grammar uses a
    // type_expr lookahead via prec to disambiguate from field_decl).
    spread_label: ($) =>
      choice($.qualified_name, $.quoted_name, $._spread_words),

    _spread_words: ($) =>
      prec.dynamic(-1, seq($.identifier, repeat($.identifier))),

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

    // src_path(, src_path)* -> tgt_path (metadata)? { pipe_chain }?
    map_arrow: ($) =>
      seq(
        commaSep1($.src_path),
        "->",
        $.tgt_path,
        optional($.metadata_block),
        optional($._arrow_transform_body),
      ),

    // { pipe_chain } transform body on an arrow
    _arrow_transform_body: ($) => seq("{", $.pipe_chain, "}"),

    // ── Arrow paths ───────────────────────────────────────────────────────
    // src_path and tgt_path are named wrapper nodes.
    // [] is removed from all paths — iteration is expressed via each/flatten.

    src_path: ($) => $._path_expr,
    tgt_path: ($) => $._path_expr,

    _path_expr: ($) =>
      choice(
        $.namespaced_path,
        $.backtick_path,
        $.relative_field_path,
        $.field_path,
      ),

    // ns::identifier or ns::identifier.field...
    // token.immediate(".") ensures continuation dots must be adjacent (no
    // newlines) so multi-line bare arrows are not merged into one path.
    namespaced_path: ($) =>
      prec.right(seq(
        $.identifier,
        "::",
        $._path_seg,
        repeat(seq(token.immediate("."), $._path_seg)),
      )),

    // `BacktickRef` or `BacktickRef`.field...
    backtick_path: ($) =>
      prec.right(seq(
        $.backtick_name,
        repeat(seq(token.immediate("."), $._path_seg)),
      )),

    // .field or .field.nested...
    relative_field_path: ($) =>
      prec.right(seq(
        ".",
        $._path_seg,
        repeat(seq(token.immediate("."), $._path_seg)),
      )),

    // field or field.nested...
    field_path: ($) =>
      prec.right(seq(
        $.identifier,
        repeat(seq(token.immediate("."), $._path_seg)),
      )),

    _path_seg: ($) => choice($.identifier, $.backtick_name),

    // ── Pipe chain (transform, arrow bodies) ─────────────────────────────

    pipe_chain: ($) => seq($.pipe_step, repeat(seq("|", $.pipe_step))),

    pipe_step: ($) =>
      choice(
        $.fragment_spread,
        $.map_literal,
        $.pipe_text,
      ),

    // pipe_text: greedy repeat of basic tokens.
    // | and } naturally terminate it (not in the choice set).
    // Double quotes still work for text containing | or }.
    pipe_text: ($) =>
      repeat1(
        choice(
          $.nl_string,
          $.multiline_string,
          $.backtick_name,
          $.dotted_name,
          $.number_literal,
          $.identifier,
          $._arithmetic_op,
          $._comparison_op,
          seq(
            "(",
            repeat(
              choice(
                $.nl_string,
                $.dotted_name,
                $.identifier,
                $.number_literal,
                ",",
              ),
            ),
            ")",
          ),
        ),
      ),

    _arithmetic_op: (_) => token(choice("*", "/", "+", "-")),

    // ── Map literal ───────────────────────────────────────────────────────

    map_literal: ($) =>
      seq("map", "{", repeat(seq($.map_entry, optional(","))), "}"),

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
        $.tag_with_value,
        $.tag_token,
      ),

    enum_body: ($) =>
      seq(
        "enum",
        "{",
        commaSep1(choice($.identifier, $.nl_string, $.number_literal)),
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

    // tag_with_value: identifier followed by greedy value tokens
    tag_with_value: ($) => seq($.identifier, $.value_text),

    // value_text: greedy repeat of basic token types.
    // Commas and ) naturally terminate it (not in the choice set).
    value_text: ($) =>
      repeat1(
        choice(
          $.nl_string,
          $.multiline_string,
          $.backtick_name,
          $.qualified_dotted_name,
          $.dotted_name,
          $.qualified_name,
          $.number_literal,
          $.boolean_literal,
          $.identifier,
          $._comparison_op,
          seq(
            "{",
            commaSep1(choice($.qualified_name, $.identifier)),
            optional(","),
            "}",
          ),
        ),
      ),

    // ns::identifier.field... — namespace-qualified dotted ref path
    qualified_dotted_name: ($) =>
      seq($.qualified_name, repeat1(seq(".", $.identifier))),

    dotted_name: ($) =>
      prec.left(seq($.identifier, repeat1(seq(".", choice($.identifier, $.number_literal))))),

    number_literal: (_) => /[0-9]+(\.[0-9]+)?/,

    boolean_literal: (_) => choice("true", "false"),

    tag_token: ($) => $.identifier,

    // ── Lexical tokens ────────────────────────────────────────────────────

    identifier: (_) => /[a-zA-Z_][a-zA-Z0-9_-]*/,

    quoted_name: (_) => /'(?:[^'\\]|\\.)*'/,

    backtick_name: (_) => /`(?:[^`\\]|\\.)*`/,

    multiline_string: (_) => token(prec(1, /"""([^"]|"[^"]|""[^"])*"""/)),

    nl_string: (_) => /"(?:[^"\\]|\\.)*"/,

    warning_comment: (_) => token(prec(3, /\/\/!.*/)),
    question_comment: (_) => token(prec(2, /\/\/\?.*/)),
    comment: (_) => token(prec(1, /\/\/.*/)),
  },
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}
