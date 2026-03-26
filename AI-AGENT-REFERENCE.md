# Satsuma — AI Agent Reference

## System Prompt Insert (~900 tokens total)

> Copy the sections below into your AI agent's system prompt to enable
> reliable Satsuma generation and consumption.

---

### Grammar (compact EBNF, ~500 tokens)

```ebnf
file             = { import_stmt | note_block | namespace | schema | fragment | transform | mapping | metric } ;

import_stmt      = "import" "{" name_list "}" "from" STRING ;
name_list        = name {"," name} ;
name             = qualified_name | IDENT | BACKTICK_IDENT ;
qualified_name   = IDENT "::" IDENT ;

note_block       = "note" "{" (STRING | TRIPLESTRING) "}" ;

namespace        = "namespace" IDENT ["(" metadata ")"] "{" namespace_body "}" ;
namespace_body   = { note_block | schema | fragment | transform | mapping | metric } ;

schema           = "schema" label ["(" metadata ")"] "{" schema_body "}" ;
fragment         = "fragment" label "{" schema_body "}" ;
label            = IDENT | BACKTICK_IDENT ;

metadata         = meta_entry {"," meta_entry} ;
meta_entry       = IDENT [value] | IDENT "{" enum_items "}" | "note" (STRING | TRIPLESTRING) ;
enum_items       = value {"," value} ;

schema_body      = { field_decl | spread | COMMENT } ;
field_decl       = (IDENT | BACKTICK_IDENT) [type_expr] ["(" metadata ")"] ["{" schema_body "}"] ;
type_expr        = TYPE ["(" params ")"] | "record" | "list_of" TYPE ["(" params ")"] | "list_of" "record" ;
spread           = "..." name ;

transform        = "transform" label "{" transform_body "}" ;
transform_body   = { STRING | pipe_step {"|" pipe_step} } ;

metric           = "metric" label [STRING] ["(" metric_meta ")"] "{" metric_body "}" ;
metric_meta      = metric_entry {"," metric_entry} ;
metric_entry     = "source" (namespaced_name | IDENT | "{" name_list "}") | "grain" IDENT
                 | "slice" "{" name_list "}" | "filter" STRING ;
metric_body      = { field | note_block | COMMENT } ;

mapping          = "mapping" [label] ["(" metadata ")"] "{" mapping_body "}" ;
mapping_body     = { note_block | source_decl | target_decl | arrow | nested_arrow | each_block | flatten_block | COMMENT } ;
source_decl      = "source" "{" ref_list "}" ;
target_decl      = "target" "{" ref_list "}" ;
ref_list         = { BACKTICK_IDENT | STRING } ;

arrow            = source_paths "->" field_path ["(" metadata ")"] ["{" transform_body "}"] ;
source_paths     = [field_path {"," field_path}] ;
nested_arrow     = field_path "->" field_path ["(" metadata ")"] "{" mapping_body "}" ;
each_block       = "each" field_path "->" field_path ["(" metadata ")"] "{" mapping_body "}" ;
flatten_block    = "flatten" field_path "->" field_path ["(" metadata ")"] "{" mapping_body "}" ;

pipe_step        = IDENT ["(" params ")"] | ARITH NUMBER | "map" "{" map_entries "}" | STRING ;
map_entries      = { map_key ":" value } ;
map_key          = value | "<" NUMBER | "default" | "_" | "null" ;

field_path       = namespaced_path | segment {"." segment} ;
namespaced_path  = IDENT "::" segment {"." segment} ;
segment          = IDENT | BACKTICK_IDENT ;

IDENT            = LETTER {LETTER | DIGIT | "_" | "-"} ;
BACKTICK_IDENT   = "`" {ANY} "`" ;
STRING           = '"' {ANY} '"' ;
TRIPLESTRING     = '"""' {ANY} '"""' ;
COMMENT          = ("//" | "//!" | "//?") TEXT_TO_EOL ;
```

---

### Cheat Sheet (~400 tokens)

```markdown
# Satsuma Quick Reference

## Three delimiters, three jobs
( ) = metadata      { } = structural content      " " = natural language

## Schema blocks
schema <name> (<metadata>) {
  field_name    TYPE           (tags)       // info
  field_name    TYPE           (tags)       //! warning
  field_name    TYPE           (tags)       //? todo
  nested_obj record {
    child       TYPE
  }
  repeated_items list_of record {
    item        TYPE
  }
  scalar_tags list_of STRING (note "tag values")    // scalar list — no subfields
  ...fragment_name
}

Metadata tokens (in parens):  pk, required, unique, indexed, pii, encrypt,
  encrypt AES-256-GCM, default val, enum {a, b, c}, format email,
  ref table.field, note "...", xpath "...", namespace prefix "uri", filter COND

Reserved keywords: schema, fragment, mapping, transform, metric, note,
  source, target, import, from, record, list_of, each, flatten, namespace

## Namespace blocks
namespace <name> (<metadata>) {
  schema ...
  mapping ...
  // any top-level block except import and other namespaces
}

Cross-namespace references use :: syntax:
  source { `ns::schema_ref` }          // in mapping source/target
  source ns::schema_name               // in metric metadata
  import { ns::name } from "file.stm"  // in imports

## Mapping blocks
mapping <name> (<metadata>) {
  source { `schema_ref` }
  target { `schema_ref` }

  src -> tgt                                 // direct
  src -> tgt { transform }                   // with transform
  src -> tgt { trim | lowercase }            // pipeline
  src -> tgt { "Derive from @src using NL" }  // natural language with @ref
  src1, src2 -> tgt { "multi-source" }       // multiple sources
  -> tgt { "computed, no source" }           // derived field
  -> tgt { now_utc() }                       // function

  Transforms (combine with | inside { }):
    trim, lowercase, uppercase, title_case, null_if_empty, null_if_invalid
    drop_if_invalid, drop_if_null, warn_if_invalid, warn_if_null
    error_if_invalid, error_if_null
    coalesce(val), round(n), truncate(n), max_length(n)
    prepend("x"), append("x"), split("x") | first | last
    validate_email, to_e164, to_iso8601, to_utc, now_utc()
    pad_left(n, c), pad_right(n, c), replace(old, new), escape_html
    to_string, to_number, to_boolean, uuid_v5(ns, name)
    encrypt(algo, key), hash(algo), parse(fmt)
    * N, / N, + N, - N
    map { src: "tgt", null: "default", _: "fallback" }
    map { < 1000: "low", < 5000: "mid", default: "high" }
    "NL description — use @field_name for refs"

  Array mapping:
  each src_arr -> tgt_arr {
    .child -> .child { transform }
  }

  Flattening a list:
  flatten src.list_field -> flat_target {
    .child -> .child { transform }
  }
}

## Reusability
fragment <name> { fields... }              (spread with ...name)
transform <name> { pipeline or NL... }     (spread with ...name)
import { name1, name2 } from "file.stm"
import { ns::name1, ns::name2 } from "other.stm"  // namespace-qualified

## Metric blocks
metric <name> ["display label"] (<metric_meta>) {
  measure_field  TYPE  (measure additive)
  measure_field  TYPE  (measure non_additive)
  measure_field  TYPE  (measure semi_additive)
  note { "..." }
}

Metric metadata tokens (in parens):
  source schema_name | source ns::schema_name | source {schema_a, schema_b}
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

## @ref in NL Strings (IMPORTANT)
ALWAYS use @ref for field and schema names inside "..." NL strings:
  -> total { "Sum @line_amount grouped by @order_id" }
  (note "Derived from @customer.email after dedup")
This is NOT optional — tooling extracts @ref references for
deterministic lineage tracing. Bare names in NL are invisible to tools.

Backtick only segments with special characters:
  "Look up @`order-headers`.status in the dim table"
@ref schemas are structural sources; lint --fix auto-adds undeclared
@ref schemas to the mapping source list.
```

---

## Satsuma CLI — Agent Tooling

> **Tip:** This document is baked into the CLI itself. Run `satsuma agent-reference` to print it — useful for piping into an agent's instructions file or system prompt.

The `satsuma` CLI is a deterministic structural extraction tool. It extracts facts from parse trees and delivers NL content verbatim. **It does not interpret natural language — that is your job.** The CLI is the toolkit. You are the runtime.

Every command produces 100% correct results from structural analysis. There are no `impact`, `coverage`, `audit`, or `inventory` commands — those are workflows you compose from primitives, applying your own reasoning to the NL content the CLI surfaces.

### Command reference

```bash
# Workspace extractors — retrieve whole blocks
satsuma summary path/to/workspace/          # overview — schemas, mappings, metrics, counts
satsuma schema hub_customer                  # full schema definition
satsuma mapping "sfdc to hub_customer"        # full mapping with all arrows
satsuma metric monthly_revenue               # full metric definition
satsuma lineage --from loyalty_sfdc          # schema-level graph traversal
satsuma where-used hub_product               # all references to a name
satsuma find --tag pii                       # fields carrying a metadata tag
satsuma warnings                             # all //! and //? comments
satsuma context "customer mapping"           # keyword-ranked block extraction (heuristic)

# Structural primitives — slice below block level
satsuma arrows loyalty_sfdc.LoyaltyTier      # all arrows involving this field + classification
satsuma nl "demographics to mart"               # NL content in a mapping
satsuma nl mart_customer_360.email            # NL content on a specific field
satsuma nl all path/to/workspace/             # all NL across the workspace
satsuma meta loyalty_sfdc.Email              # metadata entries (tags, type, constraints)
satsuma fields sat_customer_demographics     # field list with types
satsuma fields mart_customer_360 --unmapped-by 'demographics to mart'  # fields with no arrows
satsuma match-fields --source loyalty_sfdc --target sat_customer_demographics  # name comparison

# Workspace graph — full topology in one call
satsuma graph path/to/workspace/ --json      # complete semantic graph (nodes, edges, field-level flow)
satsuma graph path/ --json --schema-only     # topology only (no field-level edges)
satsuma graph path/ --json --namespace crm   # filter to a namespace
satsuma graph path/ --json --no-nl           # strip NL text for smaller payload
satsuma graph path/ --compact                # flat schema-level adjacency list

# Formatting
satsuma fmt path/to/workspace/               # format all .stm files in place
satsuma fmt file.stm                         # format a single file
satsuma fmt --check                          # CI mode — exit 1 if any file would change
satsuma fmt --diff file.stm                  # print diff without writing
cat file.stm | satsuma fmt --stdin           # pipe: read stdin, write stdout

# Structural analysis
satsuma validate                             # parse errors + semantic reference checks
satsuma lint                                 # policy/convention checks (duplicates, NL refs)
satsuma lint --fix                           # apply safe deterministic fixes
satsuma lint --json                          # structured lint diagnostics
satsuma diff v1/ v2/                         # structural comparison of two snapshots
```

### Transform classification

Every arrow the CLI returns carries a classification from CST node types:

| Marker | Meaning | Your responsibility |
|---|---|---|
| `[structural]` | Deterministic pipeline | None — fully specified |
| `[nl]` | NL string — extracted verbatim | Read it, interpret intent, judge correctness |
| `[mixed]` | Both pipeline steps and NL | Review the NL portion |
| `[none]` | Bare `src -> tgt`, no transform | None |
| `[nl-derived]` | Implicit arrow from NL `@ref` | Synthetic — verify the referenced field exists |

### How you compose workflows

**Whole-workspace reasoning:** Call `satsuma graph path/ --json` to load the entire workspace topology in one call — nodes (schemas, mappings, metrics, fragments, transforms), field-level edges with transform classification, and schema-level topology. Use `--schema-only` for topology-only queries, `--namespace <ns>` to scope, `--no-nl` to reduce payload size. The `unresolved_nl` section lists all NL arrows requiring interpretation.

**Impact analysis:** Call `satsuma arrows <field> --as-source --json`, follow each target with another `arrows` call, recurse. At `[nl]` hops, call `satsuma nl` to read the NL content and reason about it yourself.

**Coverage check:** Call `satsuma fields <target> --unmapped-by <mapping> --json` for each mapping. Intersect results to find fields unmapped by all mappings. For mapped fields, check classification via `satsuma arrows`.

**PII audit:** Call `satsuma find --tag pii --json`, then `satsuma arrows` for each tagged field, recurse downstream. At `[nl]` hops, read the NL to judge whether PII survives the transform.

**Drafting a mapping:** Call `satsuma match-fields` for deterministic name matches. Call `satsuma nl` on both schemas to read field notes. Apply your own judgment for non-obvious matches and transforms.

**Reviewing a change:** Call `satsuma diff` for the structural delta. Call `satsuma arrows` for affected fields. Call `satsuma nl` to read NL content on changed arrows.

### When to use the CLI vs. reading files

| Situation | Approach |
|---|---|
| Need full workspace topology in one call | `satsuma graph --json` — all nodes, edges, and field-level flow |
| Need to understand a workspace | `satsuma summary`, then drill with `satsuma schema` / `satsuma mapping` |
| Need arrows for a specific field | `satsuma arrows <schema.field>` — not reading the whole mapping |
| Need NL content for interpretation | `satsuma nl <scope>` — not pulling the entire block |
| Need metadata on a field | `satsuma meta <schema.field>` — not parsing raw text |
| Need to check which fields lack arrows | `satsuma fields <schema> --unmapped-by <mapping>` |
| Need to validate after editing | `satsuma validate` for correctness, `satsuma lint` for conventions |
| Need to compare versions | `satsuma diff` — not text diff |
| Need full file content for editing | Read the file directly — CLI is for querying, not raw content |

### CLI output in prompts

Use `--json` when you need to process output programmatically (which is most of the time in composed workflows). Use `--compact` to minimize tokens when you only need structure. Text output is for human readability.

When reporting results to humans, be transparent about which parts of your analysis came from structural CLI output vs. your own interpretation of NL content.

---

## Agent Workflow

### When generating Satsuma from a description or spreadsheet:

1. If source and target schemas already exist, run `satsuma match-fields --source <s> --target <t>` to find deterministic name matches, then `satsuma nl <s>` and `satsuma nl <t>` to read field notes for context
2. Start with a `note { }` block describing the integration context
3. Define `schema` blocks with all fields, types, and metadata
4. Add `fragment` blocks if you have reusable field sets
5. Write the `mapping { }` block with source/target refs and all arrows
6. Use `"natural language"` in `{ }` for any transform you can't express as a pipeline — use `@ref` for any field or schema names referenced inside the NL string (e.g. `"Sum @amount grouped by @customer_id"`)
7. Add `//!` warnings for known data quality issues
8. Add `//?` for any open questions or ambiguities
9. Add `(note "...")` metadata for persistent field-level documentation
10. Run `satsuma fmt` to apply canonical formatting
11. Run `satsuma validate` to check for parse errors and semantic issues
12. Run `satsuma lint` to check for policy/convention issues; use `--fix` to auto-correct fixable ones
13. Run `satsuma fields <target> --unmapped-by <mapping>` to check which target fields you haven't covered

### When reading/interpreting Satsuma:

1. Run `satsuma summary` to understand the workspace scope before reading individual files
2. Use `satsuma schema <name>` and `satsuma mapping <name>` to inspect specific blocks
3. Use `satsuma arrows <schema.field>` to trace specific fields through mappings — don't search manually
4. Use `satsuma nl <scope>` to read NL content you need to interpret
5. `src -> tgt` means source-to-target; `-> tgt` (no left side) means computed/derived
6. Transform content is in `{ }` after the arrow — pipelines read left-to-right
7. `"..."` strings in transforms are natural language intent — interpret and implement
8. `//!` comments are warnings about data quality or known issues — also visible via `satsuma warnings`
9. `note { }` blocks contain rich documentation

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
| Using `STRUCT { }` / `ARRAY { }` for nesting | Use `Name record { }` / `Name list_of record { }` |
| Using `when/else` conditionals | Use `map { }` with conditions or NL strings |
| Forgetting to declare arrays with `list_of` | Use `Name list_of record { }` for repeated structures, `Name list_of TYPE` for scalar lists |
| Using `[]` in mapping paths | Use `each src -> tgt { }` for iteration, dot paths for field access |
| Using `(flatten \`list\`)` metadata on mappings | Use `flatten src.list -> tgt { }` block syntax inside mapping body |
| Repeating schema IDs in paths inside implicit mapping blocks | Bare names resolve to source (left) and target (right) |
| Using `schema` for a business metric | Use `metric` — it signals a terminal node to lineage tooling |
| Using a `metric` as a mapping source or target | Metrics are consumers only; reference the underlying `schema` instead |
| Summing a `non_additive` measure across dimensions | Use weighted average or re-aggregate from grain; only `additive` measures can be summed |
| Using `'single quotes'` for labels | Use `` `backtick quotes` `` — single quotes are not supported |
| Writing field names bare in NL strings | Use `@ref` for field/schema references inside `"..."` strings — e.g. `"Sum @order_total grouped by @customer_id"`. This enables deterministic extraction by tooling. |
| Referencing a schema in NL without declaring it | `@ref` schemas in NL text must be in the mapping's `source { }` block. Use `satsuma lint --fix` to auto-add undeclared refs. |

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

## Example: Converting an Excel mapping row to Satsuma

**Excel row:**

| Source Field | Source Type | Target Field | Target Type | Transformation | Notes |
|---|---|---|---|---|---|
| CUST_TYPE | CHAR(1) | customer_type | VARCHAR(20) | R=Retail, B=Business, G=Government. If null, default to Retail | Some records have null values |

**Satsuma equivalent:**

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
