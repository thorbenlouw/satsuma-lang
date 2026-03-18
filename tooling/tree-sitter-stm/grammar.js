/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * STM v2 Grammar — Phase 3: Metadata blocks
 *
 * Adds structured metadata_block parsing, replacing the opaque _opaque_parens
 * stub in schema_block, mapping_block, and metric_block.
 *
 * Metadata grammar:
 *   metadata_block ::= "(" _metadata_entry* ")"
 *   _metadata_entry ::= enum_body | slice_body | note_tag | key_value_pair | tag_token
 *
 * Key design decisions:
 *   - kv_key uses its own regex (identical to identifier's) so reserved keywords
 *     like `source` and `target` can appear as metadata keys (e.g. in metric
 *     metadata: `source fact_subscriptions`). Tree-sitter keyword exclusion only
 *     applies to rules based on `$.identifier`.
 *   - key_value_pair vs tag_token is an LR(1) conflict (needs 1 extra token of
 *     lookahead); declared in `conflicts` and handled by the GLR algorithm.
 *   - `enum` and `slice` are implicitly elevated to keywords by appearing as
 *     string literals in enum_body / slice_body. They are never valid as bare
 *     tag_tokens (vocabulary tokens that happen to share those names remain
 *     expressible via kv_key).
 */

module.exports = grammar({
  name: "stm",

  // Whitespace and comments are extras — threaded into the CST without
  // affecting syntactic structure.
  extras: ($) => [
    /[ \t\f\r\n]+/,
    $.warning_comment,
    $.question_comment,
    $.comment,
  ],

  // Enables automatic keyword / identifier disambiguation.
  word: ($) => $.identifier,

  // Declared LR(1) conflicts resolved by the GLR algorithm.
  conflicts: ($) => [
    // After seeing an identifier in _metadata_entry, we need one more token
    // to decide between key_value_pair (kv_key + value) and tag_token (standalone).
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

    // ── Block types ───────────────────────────────────────────────────────
    // Bodies remain as opaque stubs (filled in phases 4–9).
    // Metadata ( ) is now structured via metadata_block.

    schema_block: ($) =>
      seq(
        "schema",
        $.block_label,
        optional($.metadata_block),
        $._opaque_braces,
      ),

    fragment_block: ($) =>
      seq(
        "fragment",
        $.block_label,
        $._opaque_braces,
      ),

    transform_block: ($) =>
      seq(
        "transform",
        $.block_label,
        $._opaque_braces,
      ),

    mapping_block: ($) =>
      seq(
        "mapping",
        optional($.block_label),
        optional($.metadata_block),
        $._opaque_braces,
      ),

    metric_block: ($) =>
      seq(
        "metric",
        $.block_label,
        optional($.nl_string), // optional display label e.g. "MRR"
        $.metadata_block, // required: (source X, grain monthly, ...)
        $._opaque_braces, // body: field decls + note blocks
      ),

    note_block: ($) =>
      seq(
        "note",
        "{",
        choice($.multiline_string, $.nl_string),
        "}",
      ),

    // ── Block label ───────────────────────────────────────────────────────

    block_label: ($) => choice($.identifier, $.quoted_name),

    // ── Metadata block ────────────────────────────────────────────────────

    // Comma-separated entries inside ( ). Trailing comma is permitted.
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

    // enum { val1, val2, val3 } — field enumeration brace list.
    // "enum" becomes an implicit keyword via string literal + word property.
    enum_body: ($) =>
      seq(
        "enum",
        "{",
        commaSep1($.identifier),
        optional(","),
        "}",
      ),

    // slice { dim1, dim2 } — metric slice-dimension brace list.
    // "slice" becomes an implicit keyword.
    slice_body: ($) =>
      seq(
        "slice",
        "{",
        commaSep1($.identifier),
        optional(","),
        "}",
      ),

    // note "..." or note """...""" — inline documentation inside metadata.
    // "note" is a reserved keyword so no conflict with tag_token.
    note_tag: ($) =>
      seq(
        "note",
        choice($.multiline_string, $.nl_string),
      ),

    // identifier value — e.g. `format email`, `grain monthly`, `source orders`
    // kv_key has its OWN regex (not based on $.identifier) so reserved keywords
    // like `source` and `target` can be matched as kv_key tokens even though
    // they are excluded from $.identifier by keyword extraction.
    key_value_pair: ($) => seq($.kv_key, $._kv_value),

    kv_key: (_) => /[a-zA-Z_][a-zA-Z0-9_-]*/,

    _kv_value: ($) =>
      choice(
        $.nl_string,
        $.multiline_string,
        $.backtick_name,
        $.identifier,
      ),

    // Bare identifier tag — e.g. `pii`, `required`, `pk`, `unique`.
    // Cannot match reserved keywords (schema, note, source, etc.)
    // or grammar-level keywords (enum, slice) — those have dedicated rules.
    tag_token: ($) => $.identifier,

    // ── Opaque balanced delimiters ────────────────────────────────────────
    // Accept any well-nested content. Used for block bodies (phases 4–9)
    // and as a fallback for balanced ( ) inside opaque brace bodies.

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

    // Triple-quoted multiline string (simplified: no " inside content in Phase 1).
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
