/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * STM v2 Grammar — Phase 1: Skeleton and lexical rules
 *
 * Establishes:
 *   - source_file / _top_level_item dispatch
 *   - All lexical token types (identifier, quoted_name, backtick_name,
 *     nl_string, multiline_string, comment, warning_comment, question_comment)
 *   - Opaque stub bodies for all block types (filled in phases 2–9)
 *
 * Keywords are excluded from bare-identifier positions via the `word` property:
 * any string literal in the grammar that matches the identifier pattern will be
 * matched as the keyword token rather than $.identifier, so e.g.
 * `schema schema {}` is a parse error because the second `schema` is a keyword.
 */

module.exports = grammar({
  name: "stm",

  // Whitespace and comments are "extras" — they are threaded into the CST
  // at any point without affecting the structural grammar.
  // More-specific comment patterns (//!, //?) must come BEFORE the general //.
  extras: ($) => [
    /[ \t\f\r\n]+/,
    $.warning_comment,
    $.question_comment,
    $.comment,
  ],

  // Enables automatic keyword / identifier disambiguation.
  // Any string literal in grammar rules that looks like an identifier
  // will be matched as a keyword rather than $.identifier.
  word: ($) => $.identifier,

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

    // ── Block types (opaque stub bodies — structured in phases 2–9) ──────

    schema_block: ($) =>
      seq(
        "schema",
        $.block_label,
        optional($._opaque_parens),
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
        optional($._opaque_parens),
        $._opaque_braces,
      ),

    metric_block: ($) =>
      seq(
        "metric",
        $.block_label,
        optional($.nl_string), // optional display label e.g. "MRR"
        $._opaque_parens, // metadata: (source X, grain monthly, ...)
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
    // The `word` property ensures keywords cannot be matched as $.identifier,
    // so `schema schema {}` is rejected (second token is keyword, not identifier).

    block_label: ($) => choice($.identifier, $.quoted_name),

    // ── Opaque balanced delimiters ────────────────────────────────────────
    // Accept any well-nested content. Named string/name tokens are preserved
    // so they appear in the CST even in stub phase.
    // Rules starting with `_` are hidden (no named node in CST).

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

    // Identifiers: letter-or-underscore start, then alphanumeric/underscore/hyphen.
    // Hyphen is allowed (e.g. `customer-id`, `order-headers`).
    identifier: (_) => /[a-zA-Z_][a-zA-Z0-9_-]*/,

    // Single-quoted block label: 'name with spaces or special chars'
    // Supports backslash escapes (e.g. \'  \\).
    quoted_name: (_) => /'(?:[^'\\]|\\.)*'/,

    // Backtick-quoted field / reference name: `Lead_Source__c`
    // Used for field names and paths inside bodies.
    backtick_name: (_) => /`(?:[^`\\]|\\.)*`/,

    // Triple-quoted multiline string.
    // Simplified: content may not contain " characters (no external scanner needed
    // in Phase 1). A future phase may replace this with an external-scanner token
    // to support arbitrary content including embedded double-quotes.
    // [^"] matches any char except ", including newlines (character-class behaviour).
    multiline_string: (_) => token(prec(1, /"""[^"]*"""/)),

    // Double-quoted NL string. multiline_string has higher precedence so
    // """ is always consumed as multiline_string, not two nl_strings.
    nl_string: (_) => /"(?:[^"\\]|\\.)*"/,

    // Comments — higher prec values ensure //! and //? beat //.
    // All three are preserved in the CST as distinct named nodes.
    warning_comment: (_) => token(prec(3, /\/\/!.*/)),
    question_comment: (_) => token(prec(2, /\/\/\?.*/)),
    comment: (_) => token(prec(1, /\/\/.*/)),
  },
});

/**
 * One-or-more comma-separated occurrences of `rule`.
 * Trailing comma is not supported at this grammar level.
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}
