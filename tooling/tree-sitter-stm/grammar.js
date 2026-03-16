function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}

module.exports = grammar({
  name: "stm",

  extras: () => [/[ \t\f\r]/],

  word: ($) => $.identifier,

  conflicts: ($) => [
    // map_entry and raw_map_line both start with an identifier; prefer map_entry
    [$.map_entry, $.raw_map_line],
    // block_map_entry (lhs -> lhs { body }) vs map_entry / nested_map / raw_map_line
    [$.block_map_entry, $.map_entry],
    [$.block_map_entry, $.nested_map],
    [$.block_map_entry, $.raw_map_line],
    // nested_map (tokens followed by {}) vs map_entry vs raw_map_line
    [$.map_entry, $.nested_map],
    [$.nested_map, $.raw_map_line],
    // computed_map_entry starts with => which is also in _map_line_token / fat_arrow
    [$.computed_map_entry, $.raw_map_line],
    [$.computed_map_entry, $.fat_arrow],
    // when/else/fallback clauses start with identifiers that are also _map_line_token
    [$.when_clause, $.raw_map_line],
    [$.else_clause, $.raw_map_line],
    [$.fallback_clause, $.raw_map_line],
    [$.pipe_continuation, $.raw_map_line],
    [$.pipe_continuation, $.operator],
    // field_path and path_reference overlap in some contexts
    [$.field_path, $.path_reference],
    // relative_field_path starts with '.' which is also a symbol token
    [$.relative_field_path, $.symbol],
    // namespaced paths share prefix
    [$.namespaced_field_path, $.namespaced_path],
    // when_clause vs map_entry: source field named "when"
    [$.map_entry, $.when_clause],
    [$.map_entry, $.fallback_clause],
    [$.map_entry, $.else_clause],
    // inline rule conflicts: _identifier vs _map_line_token when starting a map item
    [$._identifier, $._map_line_token],
    // path_segment vs raw token sequences
    [$.path_segment, $._map_line_token],
    [$._map_lhs, $.raw_map_line],
    [$.field_path, $.raw_map_line],
    [$.namespaced_field_path, $._map_line_token],
    // transform_head starts with ':' which is also a symbol in raw_map_line / map items
    [$.transform_head, $.raw_map_line],
    [$.transform_head, $.symbol],
    // value_map_literal uses "map" keyword which is also a valid identifier
    // (Note: top-level keyword is "mapping", so no ambiguity with value_map_literal's "map")
    [$.value_map_literal, $._map_line_token],
    [$.value_map_literal, $.identifier],
  ],

  rules: {
    source_file: ($) =>
      repeat(choice($._newline, $.comment_line, $._top_level_declaration)),

    _top_level_declaration: ($) =>
      choice(
        $.namespace_decl,
        $.workspace_block,
        $.import_declaration,
        $.integration_block,
        $.schema_block,
        $.fragment_block,
        $.map_block
      ),

    _newline: () => /\n+/,

    comment_line: ($) => seq($.comment, $._newline),

    comment: ($) =>
      choice($.warning_comment, $.question_comment, $.info_comment),

    warning_comment: () => token(prec(3, seq("//!", /[^\n]*/))),
    question_comment: () => token(prec(2, seq("//?", /[^\n]*/))),
    info_comment: () => token(prec(1, seq("//", /[^\n]*/))),

    // --- Namespace declaration (soft keyword, at most one per file) ---

    namespace_decl: ($) =>
      seq("namespace", field("name", $.string_literal)),

    // --- Workspace block (declaration-only; no integration or map blocks) ---

    workspace_block: ($) =>
      seq(
        "workspace",
        field("name", $.string_literal),
        field("body", $.workspace_body)
      ),

    workspace_body: ($) => seq("{", repeat($._workspace_item), "}"),

    _workspace_item: ($) =>
      choice(
        $._newline,
        $.comment_line,
        $.note_block,
        $.workspace_entry
      ),

    workspace_entry: ($) =>
      seq(
        "schema",
        field("namespace", $.string_literal),
        "from",
        field("path", $.string_literal),
        $._newline
      ),

    // --- Import declarations ---

    import_declaration: ($) =>
      seq(
        "import",
        choice(
          field("path", $.string_literal),
          seq("{", field("imports", commaSep1($.import_spec)), "}", "from", field("path", $.string_literal))
        )
      ),

    import_spec: ($) =>
      seq(
        field("name", $._identifier),
        optional(seq("as", field("alias", $._identifier)))
      ),

    integration_block: ($) =>
      seq("integration", field("name", $.string_literal), field("body", $.integration_body)),

    integration_body: ($) => seq("{", repeat($._integration_item), "}"),

    _integration_item: ($) =>
      choice(
        $._newline,
        $.comment_line,
        $.note_block,
        $.integration_field
      ),

    integration_field: ($) =>
      seq(
        field("name", $.identifier),
        repeat1($._value_token),
        optional($.comment),
        $._newline
      ),

    schema_block: ($) =>
      seq(
        field("keyword", $.schema_keyword),
        field("name", $._identifier),
        optional(field("description", $.string_literal)),
        repeat($.annotation),
        field("body", $.schema_body)
      ),

    schema_keyword: () =>
      choice("source", "target", "table", "message", "record", "event", "schema", "lookup"),

    fragment_block: ($) =>
      seq(
        "fragment",
        field("name", $._identifier),
        optional(field("description", $.string_literal)),
        field("body", $.schema_body)
      ),

    schema_body: ($) => seq("{", repeat($._schema_item), "}"),

    _schema_item: ($) =>
      choice(
        $._newline,
        $.comment_line,
        $.note_block,
        $.fragment_spread,
        $.field_declaration,
        $.group_declaration,
        $.array_group_declaration
      ),

    fragment_spread: ($) =>
      seq("...", field("name", $._identifier), optional($.comment), $._newline),

    field_declaration: ($) =>
      seq(
        field("name", $._identifier),
        field("type", $.type_expression),
        optional(field("tags", $.tag_list)),
        repeat(field("annotation", $.annotation)),
        optional(field("note", $.inline_note_block)),
        optional($.comment),
        $._newline
      ),

    group_declaration: ($) =>
      seq(
        field("name", $._identifier),
        repeat(field("annotation", $.annotation)),
        field("body", $.schema_body)
      ),

    array_group_declaration: ($) =>
      seq(
        field("name", $._identifier),
        "[]",
        repeat(field("annotation", $.annotation)),
        field("body", $.schema_body)
      ),

    inline_note_block: ($) =>
      seq("{", repeat(choice($._newline, $.comment_line)), $.note_block, repeat(choice($._newline, $.comment_line)), "}"),

    note_block: ($) =>
      seq(
        "note",
        field("value", $.multiline_string),
        optional($.comment),
        $._newline
      ),

    type_expression: ($) =>
      seq(
        field("name", $._identifier),
        optional(
          seq(
            "(",
            field("arguments", commaSep1($.type_argument)),
            ")"
          )
        )
      ),

    type_argument: ($) =>
      choice($.string_literal, $.number_literal, $.boolean_literal, $.null_literal, $._identifier),

    tag_list: ($) => seq(
      "[",
      optional($._newline),
      $.tag,
      repeat(seq(optional($._newline), ",", optional($._newline), $.tag)),
      optional(","),
      optional($._newline),
      "]"
    ),

    tag: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq(":", field("value", $.tag_value)))
      ),

    tag_value: ($) =>
      choice(
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $.enum_value_set,
        $.standard_ref,
        $.path_reference
      ),

    enum_value_set: ($) => seq(
      "{",
      optional($._newline),
      $.enum_value,
      repeat(seq(optional($._newline), ",", optional($._newline), $.enum_value)),
      optional(","),
      optional($._newline),
      "}"
    ),

    enum_value: ($) =>
      choice(
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $._identifier
      ),

    // =========================================================
    // Map blocks
    // =========================================================

    map_block: ($) =>
      seq(
        "mapping",
        optional(
          seq(
            field("source", $.namespaced_path),
            "->",
            field("target", $.namespaced_path)
          )
        ),
        optional($.map_option_list),
        field("body", $.map_body)
      ),

    map_body: ($) => seq("{", repeat($._map_item), "}"),

    _map_item: ($) =>
      choice(
        $._newline,
        $.comment_line,
        $.note_block,
        // Structured entry types (preferred over raw_map_line via conflicts + ordering)
        $.computed_map_entry,
        $.block_map_entry,
        $.map_entry,
        $.nested_map,
        // Transform continuation lines
        $.transform_head,
        $.pipe_continuation,
        $.when_clause,
        $.else_clause,
        $.fallback_clause,
        // Catch-all fallback for complex or unstructured lines
        $.raw_map_line
      ),

    // Direct mapping: source -> target [: transform] [comment]
    map_entry: ($) =>
      prec.dynamic(10, prec.right(1, seq(
        field("source", $._map_lhs),
        "->",
        field("target", $._map_lhs),
        optional(seq(":", field("transform", repeat1($._transform_token)))),
        optional($.comment),
        $._newline
      ))),

    // Computed mapping: => target [: transform] [comment]
    computed_map_entry: ($) =>
      prec.dynamic(10, seq(
        "=>",
        field("target", $._map_lhs),
        optional(seq(":", field("transform", repeat1($._transform_token)))),
        optional($.comment),
        $._newline
      )),

    // Structured block mapping: source -> target { body } — named source/target with a nested body
    block_map_entry: ($) =>
      prec.dynamic(12, seq(
        field("source", $._map_lhs),
        "->",
        field("target", $._map_lhs),
        field("body", $.map_body)
      )),

    // Block mapping: tokens { body } — covers nested array maps and entries with inline notes
    nested_map: ($) =>
      prec.dynamic(8, seq(repeat1($._map_line_token), field("body", $.map_body))),

    // Fallback: any token sequence ending in newline (catch-all)
    raw_map_line: ($) =>
      seq(repeat1($._map_line_token), optional($.comment), $._newline),

    // =========================================================
    // Transform continuation lines
    // =========================================================

    // Pipeline continuation: | step1 | step2
    pipe_continuation: ($) =>
      prec.dynamic(9, seq("|", repeat($._transform_token), optional($.comment), $._newline)),

    // Conditional branch: when <condition> => <value>
    when_clause: ($) =>
      prec.dynamic(9, seq(
        "when",
        field("condition", repeat($._condition_token)),
        "=>",
        field("value", repeat1($._transform_token)),
        optional($.comment),
        $._newline
      )),

    // Else branch: else => <value>
    else_clause: ($) =>
      prec.dynamic(9, seq(
        "else",
        "=>",
        field("value", repeat1($._transform_token)),
        optional($.comment),
        $._newline
      )),

    // Fallback source: fallback <path> [| transforms]
    fallback_clause: ($) =>
      prec.dynamic(9, seq(
        "fallback",
        field("path", $._map_lhs),
        optional(seq("|", field("transform", repeat1($._transform_token)))),
        optional($.comment),
        $._newline
      )),

    // Colon-prefixed transform head on its own continuation line: : expr | pipe ...
    transform_head: ($) =>
      prec.dynamic(9, seq(
        ":",
        repeat1($._transform_token),
        optional($.comment),
        $._newline
      )),

    // =========================================================
    // Value-map literals (inline lookup tables used in transforms)
    // =========================================================

    // map { key: value, key: value }
    value_map_literal: ($) =>
      seq(
        "map",
        "{",
        optional($._newline),
        $.value_map_entry,
        repeat(seq(",", optional($._newline), $.value_map_entry)),
        optional(","),
        optional($._newline),
        "}"
      ),

    value_map_entry: ($) =>
      seq(
        field("key", choice($._identifier, $.string_literal, $.null_literal, $.wildcard)),
        ":",
        field("value", choice($.string_literal, $.number_literal, $.boolean_literal, $.null_literal))
      ),

    // =========================================================
    // Paths for map entry source / target positions
    // =========================================================

    // Union of all path forms valid in map entry source/target
    _map_lhs: ($) =>
      choice(
        $.namespaced_field_path,
        $.relative_field_path,
        $.field_path
      ),

    // Namespace-qualified: ns::schema.field or ns::schema.field[]
    namespaced_field_path: ($) =>
      seq(
        field("namespace", $.identifier),
        $.namespace_separator,
        field("path", $.field_path)
      ),

    // Relative path starting with dot: .field or .items[].sku
    relative_field_path: ($) =>
      seq(".", $.path_segment, repeat(seq(".", $.path_segment))),

    // Simple or dotted path: field, field[], schema.field, items[].sku
    field_path: ($) =>
      seq($.path_segment, repeat(seq(".", $.path_segment))),

    // Single path segment with optional array marker
    path_segment: ($) =>
      seq($._identifier, optional("[]")),

    // =========================================================
    // Token sets for transform / condition content
    // =========================================================

    // Tokens that can appear in transform expressions (after :, |, when/else value, etc.)
    _transform_token: ($) =>
      choice(
        $.annotation,
        $.value_map_literal,
        $.identifier,
        $.quoted_identifier,
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $.comparison_operator,
        $.fat_arrow,
        $.operator,
        $.namespace_separator,
        $.symbol,
        $.ellipsis
      ),

    // Tokens valid in when-clause conditions (excludes fat_arrow — it terminates the condition)
    _condition_token: ($) =>
      choice(
        $.identifier,
        $.quoted_identifier,
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $.comparison_operator,
        $.operator,
        $.symbol
      ),

    // =========================================================
    // Map options
    // =========================================================

    map_option_list: ($) => seq("[", commaSep1($.map_option), "]"),

    map_option: ($) =>
      seq(field("name", $.identifier), ":", field("value", $.option_value)),

    option_value: ($) =>
      choice(
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $.field_path
      ),

    // =========================================================
    // Annotations
    // =========================================================

    annotation: ($) =>
      seq(
        "@",
        field("name", $._identifier),
        choice(
          seq("(", optional(commaSep1($.annotation_argument)), ")"),
          seq(field("key", $._identifier), "=", field("value", $.string_literal))
        )
      ),

    annotation_argument: ($) =>
      choice(
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $.path_reference,
        $.binary_expression
      ),

    binary_expression: ($) =>
      seq(
        field("left", $.path_reference),
        field("operator", $.comparison_operator),
        field("right", $.expression_value)
      ),

    expression_value: ($) =>
      choice(
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $.path_reference
      ),

    // =========================================================
    // Paths (used in annotations, tags, map options, binary expressions)
    // =========================================================

    // namespaced_path: used in map_block headers (ns::schema or just schema)
    namespaced_path: ($) =>
      seq(
        optional($.ns_qualifier),
        $._identifier,
        repeat(seq(".", $._identifier))
      ),

    // ns_qualifier: the `namespace::` prefix in qualified paths
    ns_qualifier: ($) => seq($.identifier, $.namespace_separator),

    // path_reference: dotted path used in annotations, tags, conditions, options
    path_reference: ($) =>
      seq(
        $._identifier,
        repeat(
          seq(
            ".",
            $._identifier
          )
        )
      ),

    // =========================================================
    // Lexical
    // =========================================================

    _identifier: ($) => choice($.identifier, $.quoted_identifier),

    identifier: () => /[A-Za-z][A-Za-z0-9_-]*/,

    // standard_ref: letter-started dotted name where at least one segment after a dot
    // starts with a digit — covers format standards like E.164, ISO-8601, etc.
    standard_ref: () => token(
      seq(
        /[A-Za-z][A-Za-z0-9_-]*/,
        /(\.[0-9][A-Za-z0-9_-]*)(\.[A-Za-z0-9][A-Za-z0-9_-]*)*/
      )
    ),

    quoted_identifier: () => token(seq("`", repeat(choice(/[^`]/, "``")), "`")),

    string_literal: () =>
      token(seq('"', repeat(choice(/[^"\\]/, /\\./)), '"')),

    multiline_string: () => token(/'''([^']|'[^']|''[^'])*'''/),

    number_literal: () =>
      token(seq(optional("-"), /[0-9]+/, optional(seq(".", /[0-9]+/)))),

    boolean_literal: () => choice("true", "false"),

    null_literal: () => "null",

    comparison_operator: () => choice("==", "!=", "<=", ">=", "<", ">"),

    _value_token: ($) =>
      choice(
        $.identifier,
        $.quoted_identifier,
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $.comparison_operator,
        $.symbol
      ),

    _map_line_token: ($) =>
      choice(
        $.annotation,
        $.identifier,
        $.quoted_identifier,
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $.ellipsis,
        $.arrow,
        $.fat_arrow,
        $.comparison_operator,
        $.operator,
        $.namespace_separator,
        $.symbol
      ),

    ellipsis: () => "...",
    arrow: () => "->",
    fat_arrow: () => "=>",
    operator: () => choice("+", "-", "*", "/", "|", "\\"),
    namespace_separator: () => "::",
    symbol: () => choice(":", ",", ".", "(", ")", "[", "]"),
    wildcard: () => "_"
  }
});
