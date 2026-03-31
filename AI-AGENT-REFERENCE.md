# Satsuma — AI Agent Reference

## Portable Grammar & Conventions

> Copy this section into any AI agent's system prompt to enable reliable
> Satsuma generation and consumption. No CLI access required.

---

### Grammar (compact EBNF)

This EBNF is intentionally **compact and approximate**. It is a mnemonic for
generation, not a complete formal grammar for every NL-heavy construct.

```ebnf
(* Undefined terminals — implementation-defined:
   TYPE (e.g. INT, STRING, BOOLEAN, UUID, CHAR, VARCHAR, DECIMAL, DATE, TIMESTAMP)
   value, params (comma-separated literals/identifiers)
   NUMBER, ARITH (+, -, *, /), LETTER, DIGIT, ANY, TEXT_TO_EOL *)

file             = { import_stmt | note_block | namespace | schema | fragment | transform | mapping | metric } ;

import_stmt      = "import" "{" name_list "}" "from" STRING ;
name_list        = name_ref {"," name_ref} ;
name_ref         = label | label "::" label ;

note_block       = "note" "{" (STRING | TRIPLESTRING) "}" ;

namespace        = "namespace" label ["(" metadata ")"] "{" namespace_body "}" ;
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
spread           = "..." label ;

transform        = "transform" label "{" transform_body "}" ;
transform_body   = spread | pipe_step {"|" pipe_step} ;
(* A bare STRING is a valid pipe_step, so a single NL string is a valid transform body *)

metric           = "metric" label [STRING] ["(" metric_meta ")"] "{" metric_body "}" ;
metric_meta      = metric_entry {"," metric_entry} ;
metric_entry     = "source" (name_ref | "{" name_list "}") | "grain" IDENT
                 | "slice" "{" name_list "}" | "filter" STRING ;
metric_body      = { field | note_block | COMMENT } ;

mapping          = "mapping" [label] ["(" metadata ")"] "{" mapping_body "}" ;
mapping_body     = { note_block | source_decl | target_decl | arrow | nested_arrow | each_block | flatten_block | COMMENT } ;
source_decl      = "source" "{" { source_item } "}" ;
source_item      = name_ref ["(" metadata ")"] | STRING ;
target_decl      = "target" "{" name_ref ["(" metadata ")"] "}" ;

arrow            = [source_paths] "->" field_path ["(" metadata ")"] ["{" transform_body "}"] ;
source_paths     = field_path {"," field_path} ;
nested_arrow     = field_path "->" field_path ["(" metadata ")"] "{" mapping_body "}" ;
each_block       = "each" field_path "->" field_path ["(" metadata ")"] "{" mapping_body "}" ;
flatten_block    = "flatten" field_path "->" field_path ["(" metadata ")"] "{" mapping_body "}" ;

pipe_step        = spread | IDENT ["(" params ")"] | ARITH NUMBER | "map" "{" map_entries "}" | STRING ;
map_entries      = { map_key ":" value } ;
map_key          = value | "<" NUMBER | "default" | "_" | "null" ;

field_path       = ["."] [label "::"] segment {"." segment} ;
(* :: is ONLY namespace::schema. Fields use dot: namespace::schema.field.nested *)
segment          = IDENT | BACKTICK_IDENT ;

IDENT            = LETTER {LETTER | DIGIT | "_" | "-"} ;
BACKTICK_IDENT   = "`" {ANY} "`" ;
STRING           = '"' {ANY} '"' ;
TRIPLESTRING     = '"""' {ANY} '"""' ;
COMMENT          = ("//" | "//!" | "//?") TEXT_TO_EOL ;
```

---

### Conventions & Rules

The EBNF tells you *what parses*. This section tells you **how to use it well**.

```markdown
# Satsuma Conventions

## Three delimiters, three jobs
( ) = metadata      { } = structural content      " " = natural language

## Metadata tokens (in parens)
pk, required, unique, indexed, pii, encrypt, encrypt AES-256-GCM,
default val, enum {a, b, c}, format email, ref table.field,
note "...", xpath "...", namespace prefix "uri", filter COND

## Reserved keywords
schema, fragment, mapping, transform, metric, note,
source, target, import, from, record, list_of, each, flatten, namespace

## Naming convention
Prefer lowercase snake_case for schemas, namespaces, and fields.
This avoids backtick quoting: `order_headers` not `order-headers`.
Backticks are only needed when a name contains characters outside [a-z0-9_-]:
  schema `order-headers` { ... }       // kebab-case — needs backticks
  source { `raw::crm-contacts` }       // backtick the unsafe segment only

## Path syntax — :: vs .
:: separates namespace from schema. . separates schema from field.
Never use :: to join schema to field. Namespaces are optional.
  namespace::schema                      // schema in a namespace
  namespace::schema.field                // field on a namespaced schema
  namespace::schema.field.nested_child   // nested record field
  schema.field                           // field (no namespace)
  .field                                 // relative field inside each/flatten

Cross-namespace references:
  source { raw::customers }
  target { mart::dim_customer }
  import { raw::customers, mart::dim_customer } from "platform.stm"
  metric mrr (source raw::orders, grain monthly) { ... }

## Import reachability
Imports are selective, not whole-file:
  import { customers } from "crm.stm"
brings `customers` into scope together with only the exact transitive
dependencies `customers` requires. It does NOT bring every other
definition from `crm.stm` into scope.

Workspace scope is also file-based everywhere:
  - CLI commands operate on entry files, not directories
  - IDE/LSP features for an open file use only that file's import-reachable graph
  - the surrounding folder is never an implicit merged scope

## Source blocks — not just schema names
  source {
    schema_ref
    other_source (filter "status = completed")
    "Join @schema_ref to @other_source on @customer_id = @customer_id"
  }

## Transform catalog (combine with | inside { })
  ...named_transform
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

## Metric rules
  - Metrics are terminal nodes: nothing flows *out* of a metric
  - Do NOT use a metric as source/target in a mapping block
  - Complex computation logic goes in note { } as natural language
  - Measure additivity: additive (sum all dims), non_additive (never sum),
    semi_additive (sum across some dims only, e.g. balances)

## Consumer conventions
Reports and ML models are consumer schemas, not new block types:
  schema customer_dashboard (report, source {fact_orders, dim_customer}, tool looker) { ... }
  schema churn_model (model, source {training_set}) { ... }

## @ref in NL strings (CRITICAL)
ALWAYS use @ref for field and schema names inside "..." NL strings:
  -> total { "Sum @line_amount grouped by @order_id" }
  (note "Derived from @customer.email after dedup")
  "Join @crm_customers to @orders on @crm_customers.customer_id = @orders.customer_id"
This is NOT optional — tooling extracts @ref references for
deterministic lineage tracing. Bare names in NL are invisible to tools.

Backtick only the unsafe segments:
  "Look up @`order-headers`.status in the dim table"
  "Join @raw::`crm-contacts`.`customer-id` to @mart::dim_customer.customer_id"
@ref schemas are structural sources; lint --fix auto-adds undeclared
@ref schemas to the mapping source list.

## Comments
// info   //! warning   //? question/todo
(note "inline on a field or schema")  // in metadata parens
note { "standalone block" }           // top-level or in namespace
note { """multiline **Markdown**""" } // triple-quoted
```

---

### Common mistakes

These are mistakes agents make *despite* having the grammar — non-obvious
pitfalls that the EBNF alone doesn't prevent.

| Mistake | Correct approach |
| --- | --- |
| Using `::` between schema and field (e.g. `schema::field`) | `::` is namespace-to-schema only. Use `.` for fields: `ns::schema.field.nested` |
| Using `source`/`target`/`table` as schema keywords | Use `schema` for all — role is contextual from mapping context |
| Using `STRUCT { }` / `ARRAY { }` for nesting | Use `name record { }` / `name list_of record { }` |
| Using `[]` in mapping paths for array access | Use `each src -> tgt { }` for iteration, dot paths for field access |
| Using `(flatten \`list\`)` metadata on mappings | Use `flatten src.list -> tgt { }` block syntax inside mapping body |
| Repeating schema IDs in paths inside implicit mapping blocks | Bare names resolve to source (left) and target (right) |
| Using `schema` for a business metric | Use `metric` — it signals a terminal node to lineage tooling |
| Using a `metric` as a mapping source or target | Metrics are consumers only; reference the underlying `schema` instead |
| Using `report` / `model` as block keywords | Use `schema name (report, ...) { }` or `schema name (model, ...) { }` |
| Summing a `non_additive` measure across dimensions | Use weighted average or re-aggregate from grain; only `additive` measures can be summed |
| Writing field names bare in NL strings | Use `@ref` — e.g. `"Sum @order_total grouped by @customer_id"` |
| Backticking an entire `@ref` path | Backtick only the unsafe segment(s): `@raw::\`crm-contacts\`.\`customer-id\`` |
| Referencing a schema in NL without declaring it | `@ref` schemas must be in the mapping's `source { }` block |

---

### Example: Minimal 1:1 mapping

```satsuma
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
  source { crm }
  target { warehouse }

  id     -> customer_id   { uuid_v5("namespace", id) }
  name   -> display_name  { trim | title_case }
  email  -> email_address { trim | lowercase | validate_email | null_if_invalid }
  status -> is_active     { map { A: true, I: false } }
}
```

---

### Example: Converting an Excel mapping row to Satsuma

**Excel row:**

| Source Field | Source Type | Target Field | Target Type | Transformation | Notes |
| --- | --- | --- | --- | --- | --- |
| CUST_TYPE | CHAR(1) | customer_type | VARCHAR(20) | R=Retail, B=Business, G=Government. If null, default to Retail | Some records have null values |

**Satsuma equivalent:**

```satsuma
schema legacy_customer {
  CUST_TYPE  CHAR(1)  (enum {R, B, G})  //! Some records have NULL
}

schema customer_dim {
  customer_type  VARCHAR(20)  (enum {retail, business, government}, required)
}

mapping {
  source { legacy_customer }
  target { customer_dim }

  CUST_TYPE -> customer_type {
    map {
      R: "retail"
      B: "business"
      G: "government"
      null: "retail"
    }
  }
}
```

---

## Satsuma CLI — Agent Tooling

> **Include this section only when the agent has access to the `satsuma` CLI.**
> Run `satsuma agent-reference` to print this entire document.

The `satsuma` CLI is a deterministic structural extraction tool. It extracts facts from parse trees and delivers NL content verbatim. **It does not interpret natural language — that is your job.** The CLI is the toolkit. You are the runtime.

Every command produces 100% correct results from structural analysis. There are no `impact`, `coverage`, `audit`, or `inventory` commands — those are workflows you compose from primitives, applying your own reasoning to the NL content the CLI surfaces.

**Self-discovery:** Every command supports `--help` with its full flag list, JSON output shape, and examples. Run `satsuma <command> --help` to inspect any command without consulting external docs.

### Command reference

```bash
# Workspace extractors — retrieve whole blocks
satsuma summary platform.stm                # overview — schemas, mappings, metrics, counts
satsuma schema hub_customer                  # full schema definition
satsuma mapping "sfdc to hub_customer"        # full mapping with all arrows
satsuma metric monthly_revenue               # full metric definition
satsuma lineage --from loyalty_sfdc          # schema-level graph traversal
satsuma where-used hub_product               # all references to a name
satsuma find --tag pii                       # fields carrying a metadata tag
satsuma warnings                             # all //! and //? comments
satsuma context "customer mapping"           # keyword-ranked block extraction (heuristic)

# Field-level lineage — trace a single field upstream and downstream
satsuma field-lineage loyalty_sfdc.LoyaltyTier --json     # full upstream + downstream chain
satsuma field-lineage loyalty_sfdc.LoyaltyTier --upstream # only upstream (what feeds this field)
satsuma field-lineage loyalty_sfdc.LoyaltyTier --downstream # only downstream (where this field flows)

# Structural primitives — slice below block level
satsuma arrows loyalty_sfdc.LoyaltyTier      # immediate arrows involving this field + classification
satsuma nl "demographics to mart"            # NL content in a mapping
satsuma nl mart_customer_360.email            # NL content on a specific field
satsuma nl all platform.stm                   # all NL across the entry-file workspace
satsuma meta loyalty_sfdc.Email              # metadata entries (tags, type, constraints)
satsuma fields sat_customer_demographics     # field list with types
satsuma fields mart_customer_360 --unmapped-by 'demographics to mart'  # fields with no arrows
satsuma match-fields --source loyalty_sfdc --target sat_customer_demographics  # name comparison
satsuma nl-refs platform.stm --json          # extract @ref references from NL text

# Workspace graph — full topology in one call
satsuma graph platform.stm --json            # complete semantic graph (nodes, edges, field-level flow)
satsuma graph platform.stm --json --schema-only   # topology only (no field-level edges)
satsuma graph platform.stm --json --namespace crm # filter to a namespace
satsuma graph platform.stm --json --no-nl         # strip NL text for smaller payload
satsuma graph platform.stm --compact              # flat schema-level adjacency list

# Formatting
satsuma fmt file.stm                         # format a single file
satsuma fmt --check                          # CI mode — exit 1 if any file would change
satsuma fmt --diff file.stm                  # print diff without writing
cat file.stm | satsuma fmt --stdin           # pipe: read stdin, write stdout

# Structural analysis
satsuma validate                             # parse errors + semantic reference checks
satsuma lint                                 # policy/convention checks (duplicates, NL refs)
satsuma lint --fix                           # apply safe deterministic fixes
satsuma lint --json                          # structured lint diagnostics
satsuma diff old-platform.stm new-platform.stm # structural comparison of two snapshots
```

### field-lineage vs arrows

`arrows <field>` returns the **immediate** arrows for a field (one hop).
`field-lineage <field>` traverses the **full chain** — all the way upstream and downstream, following both declared arrows and NL-derived `@ref` references, in one call.

```
arrows loyalty_sfdc.LoyaltyTier --json        # immediate: [{source, target, classification}, ...]
field-lineage loyalty_sfdc.LoyaltyTier --json # full: {field, upstream: [...], downstream: [...]}
```

Use `arrows` when you need classification details on a specific hop. Use `field-lineage` for impact analysis, PII audit, and coverage — anywhere you need the full reachability picture.

JSON shape for `field-lineage --json`:
```json
{
  "field":      "::schema.field",
  "upstream":   [{"field": "::src.f", "via_mapping": "::m", "classification": "none"}, ...],
  "downstream": [{"field": "::tgt.f", "via_mapping": "::m", "classification": "nl-derived"}, ...]
}
```

### Transform classification

Every arrow the CLI returns carries a classification from CST node types:

| Marker | Meaning | Your responsibility |
| --- | --- | --- |
| `[structural]` | Deterministic pipeline | None — fully specified |
| `[nl]` | NL string — extracted verbatim | Read it, interpret intent, judge correctness |
| `[mixed]` | Both pipeline steps and NL | Review the NL portion |
| `[none]` | Bare `src -> tgt`, no transform | None |
| `[nl-derived]` | Implicit arrow from NL `@ref` | Synthetic — verify the referenced field exists |

### Composing workflows

**Whole-workspace reasoning:** Call `satsuma graph <entry-file>.stm --json` to load the entire workspace topology for that file's import-reachable graph in one call — nodes (schemas, mappings, metrics, fragments, transforms), field-level edges with transform classification, and schema-level topology. Use `--schema-only` for topology-only queries, `--namespace <ns>` to scope, `--no-nl` to reduce payload size. The `unresolved_nl` section lists all NL arrows requiring interpretation.

**Impact analysis:** Call `satsuma arrows <field> --as-source --json`, follow each target with another `arrows` call, recurse. At `[nl]` hops, call `satsuma nl` to read the NL content and reason about it yourself.

**Coverage check:** Call `satsuma fields <target> --unmapped-by <mapping> --json` for each mapping. Intersect results to find fields unmapped by all mappings. For mapped fields, check classification via `satsuma arrows`.

**PII audit:** Call `satsuma find --tag pii --json`, then `satsuma arrows` for each tagged field, recurse downstream. At `[nl]` hops, read the NL to judge whether PII survives the transform.

**Drafting a mapping:** Call `satsuma match-fields` for deterministic name matches. Call `satsuma nl` on both schemas to read field notes. For multi-source work, describe joins/filters in the `source { }` block with `@ref`s. Apply your own judgment for non-obvious matches and transforms.

**Reviewing a change:** Call `satsuma diff` for the structural delta. Call `satsuma arrows` for affected fields. Call `satsuma nl` to read NL content on changed arrows.

### When to use the CLI vs. reading files

| Situation | Approach |
| --- | --- |
| Need full workspace topology in one call | `satsuma graph --json` — all nodes, edges, and field-level flow |
| Need to understand a workspace | `satsuma summary`, then drill with `satsuma schema` / `satsuma mapping` |
| Need arrows for a specific field | `satsuma arrows <schema.field>` — not reading the whole mapping |
| Need NL content for interpretation | `satsuma nl <scope>` — not pulling the entire block |
| Need extracted refs inside NL text | `satsuma nl-refs` — inspect `@ref` usage without rereading whole files |
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
2. Preserve existing namespace/import structure if the workspace already uses it; don't collapse namespaced definitions back to flat global names
3. Start with a `note { }` block if integration context, assumptions, or join strategy need durable documentation
4. Define `schema` blocks with all fields, types, and metadata
5. Add `fragment` blocks if you have reusable field sets
6. Use `metric` for business KPIs; use `(report)` / `(model)` metadata on `schema` for downstream consumer artifacts
7. Write the `mapping { }` block with source/target refs and all arrows
8. For multi-source mappings, put structural sources plus source-level filters in `source { }`, and describe joins in an NL string with `@ref`s
9. Use `"natural language"` in `{ }` for any transform you can't express as a pipeline — use `@ref` for any field or schema names referenced inside the NL string (e.g. `"Sum @amount grouped by @customer_id"`)
10. Add `//!` warnings for known data quality issues
11. Add `//?` for any open questions or ambiguities
12. Add `(note "...")` metadata for persistent field-level documentation
13. Run `satsuma fmt` to apply canonical formatting
14. Run `satsuma validate` to check for parse errors and semantic issues
15. Run `satsuma lint` to check for policy/convention issues; use `--fix` to auto-correct fixable ones
16. Run `satsuma fields <target> --unmapped-by <mapping>` to check which target fields you haven't covered

### When reading/interpreting Satsuma:

1. Run `satsuma summary` to understand the workspace scope before reading individual files
2. Use `satsuma schema <name>` and `satsuma mapping <name>` to inspect specific blocks
3. Use `satsuma arrows <schema.field>` to trace specific fields through mappings — don't search manually
4. Use `satsuma nl <scope>` and `satsuma nl-refs` to read NL content and inspect extracted `@ref`s
5. `src -> tgt` means source-to-target; `a, b -> tgt` means multi-source; `-> tgt` (no left side) means computed/derived
6. Transform content is in `{ }` after the arrow — pipelines read left-to-right, and `...name` spreads a named transform
7. Mapping `source { }` blocks may contain source-level filters and NL join descriptions, not just schema names
8. `"..."` strings in transforms are natural language intent — interpret them, but keep structural facts separate from your interpretation
9. `//!` comments are warnings about data quality or known issues — also visible via `satsuma warnings`
10. `note { }` blocks contain rich documentation
