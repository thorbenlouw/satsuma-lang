# STM — AI Agent Reference

## System Prompt Insert (~900 tokens total)

> Copy the sections below into your AI agent's system prompt to enable
> reliable STM generation and consumption.

---

### Grammar (compact EBNF, ~500 tokens)

```ebnf
file             = { import_stmt | integration | block | fragment | map_block } ;

import_stmt      = "import" ( STRING | "{" ident_alias {"," ident_alias} "}" "from" STRING ) ;
ident_alias      = IDENT ["as" IDENT] ;

integration      = "integration" STRING "{" { field | note | COMMENT } "}" ;

block            = BLOCK_KW IDENT [STRING] "{" block_body "}" ;
BLOCK_KW         = "source" | "target" | "table" | "message" | "record"
                 | "event" | "schema" | "lookup" ;
block_body       = { annotation | note | field | group | spread | sel_criteria | COMMENT } ;

fragment         = "fragment" IDENT [STRING] "{" block_body "}" ;

field            = IDENT type_expr [tag_list] ["{" note "}"] ;
type_expr        = IDENT ["(" params ")"] ;
tag_list         = "[" tag {"," tag} "]" ;
tag              = IDENT [":" (STRING | NUMBER | IDENT {IDENT})] ;

group            = IDENT ["[]"] "{" block_body "}" ;
spread           = "..." IDENT ;
annotation       = "@" IDENT ["(" params ")"] | "@" IDENT IDENT "=" STRING ;
note             = "note" "'''" TEXT "'''" ;
sel_criteria     = "selection_criteria" "'''" TEXT "'''" ;

map_block        = "map" [IDENT "->" IDENT] "{" map_body "}" ;
map_body         = { note | map_entry | nested_map | COMMENT } ;
map_entry        = (field_path "->" field_path | "=>" field_path) {":" transform} ;
nested_map       = field_path "->" field_path "{" map_body "}" ;

transform        = pipe_chain | nl_expr | when_chain | value_map | logic | fallback | literal ;
pipe_chain       = step {"|" step} ;
step             = IDENT ["(" params ")"] | ARITH NUMBER | nl_expr ;
nl_expr          = "nl(" STRING ")" ;
when_chain       = "when" cond "=>" val {":" "when" cond "=>" val} [":" "else" val] ;
value_map        = "map" "{" (key ":" val) {"," key ":" val} "}" ;
fallback         = "fallback" field_path {"|" step} ;

field_path       = [IDENT "."] segment {"." segment} ;
segment          = (IDENT | BACKTICK_IDENT) ["[]"] ;

IDENT            = LETTER {LETTER | DIGIT | "_" | "-"} ;
BACKTICK_IDENT   = "`" {ANY | "``"} "`" ;
COMMENT          = ("//" | "//!" | "//?") TEXT_TO_EOL ;
```

---

### Cheat Sheet (~400 tokens)

```markdown
# STM Quick Reference

## Schema blocks
source|target|message|table|event|lookup|schema <id> ["description"] {
  field_name    TYPE           [tags]       // info
  field_name    TYPE           [tags]       //! warning
  field_name    TYPE           [tags]       //? todo
  nested_obj {
    child       TYPE
  }
  array[] {
    item        TYPE
  }
  primitives[]  TYPE
  ...fragment_name
}

Tags:  [required, pk, unique, indexed, pii, encrypt, encrypt: AES-256-GCM,
        default: val, enum: a b c, format: email, min: 0, max: 100,
        pattern: "regex", ref: table.field]

Annotations:
  @format xml|fixed-length|csv|edi|json
  @xpath("path")  @pos(offset, length)  @header("Column Name")
  @filter FIELD == "value"   @ns prefix = "uri"   @path "extract.path"

## Map blocks
map [source_id -> target_id] {
  src -> tgt                                 // direct
  src -> tgt : transform                     // with transform
  => tgt : logic                             // computed (no source)
  => tgt : "literal"                         // static value

  Transforms (combine with |):
    trim, lowercase, uppercase, title_case, null_if_empty, null_if_invalid
    coalesce(val), round(n), truncate(n), max_length(n)
    prepend("x"), append("x"), split("x") | first | last
    validate_email, to_e164, to_iso8601, to_utc, now_utc()
    pad_left(n, c), pad_right(n, c), replace(old, new), escape_html
    to_string, to_number, to_boolean, uuid_v5(ns, name)
    encrypt(algo, key), hash(algo)
    * N, / N, + N, - N
    map { src: "tgt", null: "default", _: "fallback" }
    lookup(resource, key => value [, on_miss: error|null|"default"])
    nl("natural language intent")
    when <cond> => "value"
    fallback field : chain

  Array mapping:
  src_arr[] -> tgt_arr[] {
    .child -> .child : transform
  }
}

## Other
integration "name" { cardinality 1:1  author "x"  note '''...''' }
fragment <id> { fields... }          (spread with ...id)
import "file.stm"
import { id [as alias] } from "file.stm"
note '''markdown'''                  (on any block)
// info   //! warning   //? question/todo
```

---

## Agent Workflow

### When generating STM from a description or spreadsheet:

1. Start with `integration` block (name, cardinality, author)
2. Define `source` and `target` blocks with all fields, types, and tags
3. Add `lookup` blocks if any enrichment/reference data is needed
4. Write the `map {}` block with all field mappings
5. Use `nl()` for any transform you can't express as a standard function
6. Add `//!` warnings for known data quality issues
7. Add `//?` for any open questions or ambiguities
8. Add `note '''...'''` blocks for rich context that doesn't fit in inline comments

### When reading/interpreting STM:

1. Parse schema blocks to understand source and target structures
2. Read map block entries in order — each is one field-level mapping
3. `->` means source-to-target; `=>` means computed/no direct source
4. Transform chains read left-to-right: `trim | lowercase | validate_email`
5. `nl("...")` is natural language intent — interpret and implement the described logic
6. `//!` comments are warnings about data quality or known issues
7. `note '''...'''` blocks contain rich markdown documentation

### Common mistakes to avoid:

| Mistake | Correct approach |
|---|---|
| Forgetting to declare arrays with `[]` | Use `items[] { }` for array of objects, `tags[] STRING` for array of primitives |
| Using `->` for computed fields | Use `=> target_field : expression` when there's no single source |
| Repeating schema IDs in paths inside implicit map blocks | Bare names resolve to source (left) and target (right) |
| Inventing transform functions | Use `nl()` for anything not in the standard library |
| Putting transforms before `:` | Transform always follows `:` on the same or next line |
| Using `note "..."` | Always use triple quotes: `note '''...'''` |

---

## Example: Minimal 1:1 mapping

```stm
integration "Customer_Sync" {
  cardinality 1:1
}

source crm "CRM System" {
  id       INT        [pk]
  name     STRING(200)
  email    STRING(255) [pii]
  status   CHAR(1)     [enum: A I]
}

target warehouse "Data Warehouse" {
  customer_id   UUID       [pk, required]
  display_name  STRING(200) [required]
  email_address STRING(255) [format: email]
  is_active     BOOLEAN
}

map {
  id     -> customer_id   : uuid_v5("namespace", id)
  name   -> display_name  : trim | title_case
  email  -> email_address : trim | lowercase | validate_email | null_if_invalid
  status -> is_active     : map { A: true, I: false }
}
```

---

## Example: Converting an Excel mapping row to STM

**Excel row:**

| Source Field | Source Type | Target Field | Target Type | Transformation | Notes |
|---|---|---|---|---|---|
| CUST_TYPE | CHAR(1) | customer_type | VARCHAR(20) | R=Retail, B=Business, G=Government. If null, default to Retail | Some records have null values |

**STM equivalent:**

```stm
// In source block:
CUST_TYPE    CHAR(1)    [enum: R B G]    //! Some records have NULL

// In target block:
customer_type VARCHAR(20) [enum: retail business government, required]

// In map block:
CUST_TYPE -> customer_type
  : map { R: "retail", B: "business", G: "government", null: "retail" }
```
