# STM — AI Agent Reference

## System Prompt Insert (~900 tokens total)

> Copy the sections below into your AI agent's system prompt to enable
> reliable STM generation and consumption.

---

### Grammar (compact EBNF, ~500 tokens)

```ebnf
file             = { import_stmt | note_block | schema | fragment | transform | mapping | metric } ;

import_stmt      = "import" "{" name_list "}" "from" STRING ;
name_list        = name {"," name} ;
name             = IDENT | "'" ANY "'" ;

note_block       = "note" "{" (STRING | TRIPLESTRING) "}" ;

schema           = "schema" label ["(" metadata ")"] "{" schema_body "}" ;
fragment         = "fragment" label "{" schema_body "}" ;
label            = IDENT | "'" ANY "'" ;

metadata         = meta_entry {"," meta_entry} ;
meta_entry       = IDENT [value] | IDENT "{" enum_items "}" | "note" (STRING | TRIPLESTRING) ;
enum_items       = value {"," value} ;

schema_body      = { field | record_block | list_block | spread | COMMENT } ;
field            = (IDENT | BACKTICK_IDENT) TYPE ["(" metadata ")"] ;
record_block     = "record" label ["(" metadata ")"] "{" schema_body "}" ;
list_block       = "list" label ["(" metadata ")"] "{" schema_body "}" ;
spread           = "..." name ;

transform        = "transform" label "{" transform_body "}" ;
transform_body   = { STRING | pipe_step {"|" pipe_step} } ;

metric           = "metric" label [STRING] ["(" metric_meta ")"] "{" metric_body "}" ;
metric_meta      = metric_entry {"," metric_entry} ;
metric_entry     = "source" (IDENT | "{" name_list "}") | "grain" IDENT
                 | "slice" "{" name_list "}" | "filter" STRING ;
metric_body      = { field | note_block | COMMENT } ;

mapping          = "mapping" [label] ["(" metadata ")"] "{" mapping_body "}" ;
mapping_body     = { note_block | source_decl | target_decl | arrow | nested_arrow | COMMENT } ;
source_decl      = "source" "{" ref_list "}" ;
target_decl      = "target" "{" ref_list "}" ;
ref_list         = { BACKTICK_IDENT | STRING } ;

arrow            = [field_path] "->" field_path ["(" metadata ")"] ["{" transform_body "}"] ;
nested_arrow     = field_path "->" field_path ["(" metadata ")"] "{" mapping_body "}" ;

pipe_step        = IDENT ["(" params ")"] | ARITH NUMBER | "map" "{" map_entries "}" | STRING ;
map_entries      = { map_key ":" value } ;
map_key          = value | "<" NUMBER | "default" | "_" | "null" ;

field_path       = segment {"." segment} ;
segment          = (IDENT | BACKTICK_IDENT) ["[]"] ;

IDENT            = LETTER {LETTER | DIGIT | "_" | "-"} ;
BACKTICK_IDENT   = "`" {ANY} "`" ;
STRING           = '"' {ANY} '"' ;
TRIPLESTRING     = '"""' {ANY} '"""' ;
COMMENT          = ("//" | "//!" | "//?") TEXT_TO_EOL ;
```

---

### Cheat Sheet (~400 tokens)

```markdown
# STM Quick Reference

## Three delimiters, three jobs
( ) = metadata      { } = structural content      " " = natural language

## Schema blocks
schema <name> (<metadata>) {
  field_name    TYPE           (tags)       // info
  field_name    TYPE           (tags)       //! warning
  field_name    TYPE           (tags)       //? todo
  record nested_obj {
    child       TYPE
  }
  list repeated_items {
    item        TYPE
  }
  ...fragment_name
}

Metadata tokens (in parens):  pk, required, unique, indexed, pii, encrypt,
  encrypt AES-256-GCM, default val, enum {a, b, c}, format email,
  ref table.field, note "...", xpath "...", namespace prefix "uri", filter COND

## Mapping blocks
mapping <name> (<metadata>) {
  source { `schema_ref` }
  target { `schema_ref` }

  src -> tgt                                 // direct
  src -> tgt { transform }                   // with transform
  src -> tgt { trim | lowercase }            // pipeline
  src -> tgt { "NL transform description" }  // natural language
  -> tgt { "computed, no source" }           // derived field
  -> tgt { now_utc() }                       // function

  Transforms (combine with | inside { }):
    trim, lowercase, uppercase, title_case, null_if_empty, null_if_invalid
    coalesce(val), round(n), truncate(n), max_length(n)
    prepend("x"), append("x"), split("x") | first | last
    validate_email, to_e164, to_iso8601, to_utc, now_utc()
    pad_left(n, c), pad_right(n, c), replace(old, new), escape_html
    to_string, to_number, to_boolean, uuid_v5(ns, name)
    encrypt(algo, key), hash(algo), parse(fmt)
    * N, / N, + N, - N
    map { src: "tgt", null: "default", _: "fallback" }
    map { < 1000: "low", < 5000: "mid", default: "high" }
    "natural language transform description"

  Array mapping:
  src_arr[] -> tgt_arr[] {
    .child -> .child { transform }
  }
}

## Reusability
fragment <name> { fields... }              (spread with ...name)
transform <name> { pipeline or NL... }     (spread with ...name)
import { name1, name2 } from "file.stm"

## Metric blocks
metric <name> ["display label"] (<metric_meta>) {
  measure_field  TYPE  (measure additive)
  measure_field  TYPE  (measure non_additive)
  measure_field  TYPE  (measure semi_additive)
  note { "..." }
}

Metric metadata tokens (in parens):
  source schema_name | source {schema_a, schema_b}
  grain monthly | grain daily | grain weekly
  slice {dim_a, dim_b, dim_c}
  filter "sql_condition"

Measure addivity:  additive (sum across all dims)
                   non_additive (ratios, averages — never sum)
                   semi_additive (sum across some dims only, e.g. balances)

Rules:
  - Metrics are terminal nodes: nothing flows *out* of a metric
  - Do NOT use a metric as source/target in a mapping block
  - Complex computation logic goes in note { } as natural language

## Notes & Comments
note { "standalone documentation block" }
note { """multiline **Markdown** content""" }
(note "inline on a field or schema")       // in metadata parens
// info   //! warning   //? question/todo
```

---

## Agent Workflow

### When generating STM from a description or spreadsheet:

1. Start with a `note { }` block describing the integration context
2. Define `schema` blocks with all fields, types, and metadata
3. Add `fragment` blocks if you have reusable field sets
4. Write the `mapping { }` block with source/target refs and all arrows
5. Use `"natural language"` in `{ }` for any transform you can't express as a pipeline
6. Add `//!` warnings for known data quality issues
7. Add `//?` for any open questions or ambiguities
8. Add `(note "...")` metadata for persistent field-level documentation

### When reading/interpreting STM:

1. Parse schema blocks to understand source and target structures
2. Read mapping block arrows in order — each is one field-level mapping
3. `src -> tgt` means source-to-target; `-> tgt` (no left side) means computed/derived
4. Transform content is in `{ }` after the arrow — pipelines read left-to-right
5. `"..."` strings in transforms are natural language intent — interpret and implement
6. `//!` comments are warnings about data quality or known issues
7. `note { }` blocks contain rich documentation

### Common mistakes to avoid:

| Mistake | Correct approach |
|---|---|
| Using `[tags]` bracket syntax | Use `(tags)` parentheses for metadata |
| Using `source`/`target`/`table` as schema keywords | Use `schema` for all — role is contextual |
| Using `@annotation(...)` syntax | Use `(key value)` in metadata parens |
| Using `: transform` after arrow | Use `{ transform }` in braces after arrow |
| Using `nl("...")` function | Use bare `"..."` strings in `{ }` — NL is first-class |
| Using `note '''...'''` triple single-quotes | Use `(note "...")` or `note { """...""" }` |
| Using `=> target` for computed fields | Use `-> target` with no left side |
| Using `STRUCT { }` / `ARRAY { }` for nesting | Use `record Name { }` / `list Name { }` |
| Using `when/else` conditionals | Use `map { }` with conditions or NL strings |
| Forgetting to declare arrays with `list` | Use `list Name { }` for repeated structures |
| Repeating schema IDs in paths inside implicit mapping blocks | Bare names resolve to source (left) and target (right) |
| Using `schema` for a business metric | Use `metric` — it signals a terminal node to lineage tooling |
| Using a `metric` as a mapping source or target | Metrics are consumers only; reference the underlying `schema` instead |
| Summing a `non_additive` measure across dimensions | Use weighted average or re-aggregate from grain; only `additive` measures can be summed |

---

## Example: Minimal 1:1 mapping

```stm
note { "Customer sync — 1:1 mapping from CRM to data warehouse" }

schema crm (note "CRM System") {
  id       INT           (pk)
  name     STRING(200)
  email    STRING(255)   (pii)
  status   CHAR(1)       (enum {A, I})
}

schema warehouse (note "Data Warehouse") {
  customer_id   UUID        (pk, required)
  display_name  STRING(200) (required)
  email_address STRING(255) (format email)
  is_active     BOOLEAN
}

mapping {
  source { `crm` }
  target { `warehouse` }

  id     -> customer_id   { uuid_v5("namespace", id) }
  name   -> display_name  { trim | title_case }
  email  -> email_address { trim | lowercase | validate_email | null_if_invalid }
  status -> is_active     { map { A: true, I: false } }
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
// In source schema:
  CUST_TYPE    CHAR(1)    (enum {R, B, G})    //! Some records have NULL

// In target schema:
  customer_type VARCHAR(20) (enum {retail, business, government}, required)

// In mapping block:
CUST_TYPE -> customer_type {
  map {
    R: "retail"
    B: "business"
    G: "government"
    null: "retail"
  }
}
```
