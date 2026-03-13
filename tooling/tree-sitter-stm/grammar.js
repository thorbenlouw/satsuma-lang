function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}

module.exports = grammar({
  name: "stm",

  extras: () => [/[ \t\f\r]/],

  word: ($) => $.identifier,

  rules: {
    source_file: ($) =>
      repeat(choice($._newline, $.comment_line, $._top_level_declaration)),

    _top_level_declaration: ($) =>
      choice(
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

    tag_list: ($) => seq("[", commaSep1($.tag), "]"),

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
        $.path_reference
      ),

    enum_value_set: ($) => seq("{", commaSep1($.enum_value), "}"),

    enum_value: ($) =>
      choice(
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $._identifier
      ),

    map_block: ($) =>
      seq(
        "map",
        optional(
          seq(
            field("source", $.path_reference),
            "->",
            field("target", $.path_reference)
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
        $.raw_map_line,
        $.generic_map_block
      ),

    raw_map_line: ($) =>
      seq(repeat1($._map_line_token), optional($.comment), $._newline),

    generic_map_block: ($) =>
      seq(repeat1($._map_line_token), "{", repeat($._map_item), "}"),

    map_option_list: ($) => seq("[", commaSep1($.map_option), "]"),

    map_option: ($) =>
      seq(field("name", $.identifier), ":", field("value", $.option_value)),

    option_value: ($) =>
      choice(
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.null_literal,
        $.path_reference
      ),

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

    _identifier: ($) => choice($.identifier, $.quoted_identifier),

    identifier: () => /[A-Za-z][A-Za-z0-9_-]*/,

    quoted_identifier: () => token(seq("`", repeat(choice(/[^`]/, "``")), "`")),

    string_literal: () =>
      token(seq('"', repeat(choice(/[^"\\\n]/, /\\./)), '"')),

    multiline_string: () => token(/'''([^']|'|'')*'''/),

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
        $.symbol
      ),

    ellipsis: () => "...",
    arrow: () => "->",
    fat_arrow: () => "=>",
    operator: () => choice("+", "-", "*", "/", "|", "\\"),
    symbol: () => choice(":", ",", ".", "(", ")", "[", "]")
  }
});
