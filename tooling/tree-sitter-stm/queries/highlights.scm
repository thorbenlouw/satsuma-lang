; Keywords
[
  "integration" "source" "target" "table" "message" "record" "event" "schema"
  "fragment" "mapping" "map" "namespace" "workspace" "import" "lookup"
  "when" "else" "fallback" "from" "as" "note"
] @keyword

; String literals
(string_literal) @string
(multiline_string) @string

; Comments by severity
(warning_comment) @comment.error
(question_comment) @comment.warning
(info_comment) @comment

; Identifiers
(identifier) @variable
(quoted_identifier) @variable.special

; Types
(type_expression name: (identifier) @type)

; Numbers, booleans, null
(number_literal) @number
(boolean_literal) @boolean
(null_literal) @constant.builtin

; Annotations
"@" @punctuation.special
(annotation name: (identifier) @attribute)

; Arrows and operators
(arrow) @operator
(fat_arrow) @operator

; Namespace separator
(namespace_separator) @punctuation.delimiter

; Note blocks
(note_block) @comment.block

; String label in schema block used as documentation
(schema_block (string_literal) @string.documentation)

; Map options
(map_option name: (identifier) @property)

; Tag names
(tag name: (identifier) @property)
