# Feature 09 — STM CLI: LLM Context Slicer

> **Status: COMPLETED** (2026-03-18). All 16 commands implemented, 224 tests passing, `stm validate examples/` clean.

## Goal

Build a command-line tool (`stm`) that lets an LLM (or a human) extract precise, minimal slices of an STM workspace — reducing the context load needed to work with large or complex STM files. The CLI is the primary interface between LLM agents and STM; it turns a multi-file workspace into targeted, structured answers.

---

## Problem

An LLM interpreting or editing STM faces a context problem as workspaces grow:

- A realistic STM workspace might have 20+ schemas, 15+ mappings, dozens of named transforms and fragments, and hundreds of fields carrying governance metadata.
- Dumping everything into a prompt is wasteful and often exceeds context limits.
- Regex-based extraction from raw text is fragile across multi-line metadata blocks, nested structures, and single-quoted names.
- There is currently no tool to answer questions like "which schemas have PII fields?" or "what does `crm_customer` feed into?" without manually reading every file.

The CLI solves this by sitting on top of the tree-sitter CST (Feature 08) and providing structured, query-driven extraction. An LLM can call `stm <command>` and get back only the fragment of the workspace it needs.

---

## Design Principles

1. **Output is LLM-friendly by default.** Compact, structured text (not pretty-printed JSON trees) unless `--json` is requested.
2. **Every command answers one question.** Commands are narrow and composable, not Swiss-army-knife.
3. **Metrics are first-class.** `metric` blocks have dedicated commands alongside `schema` and `mapping`.
4. **The workspace is the unit.** Commands operate across all `.stm` files in a directory tree, not just a single file. File boundaries are an implementation detail.
5. **Context budget awareness.** Every command has a `--compact` flag that strips notes, comments, and NL strings to produce the most token-efficient summary possible.

---

## Success Criteria

The feature is complete when:

1. All commands listed below work correctly against the `examples/` directory.
2. `stm summary` output for the full examples workspace fits in under 2,000 tokens in `--compact` mode.
3. `stm schema <name>`, `stm metric <name>`, and `stm mapping <name>` correctly reconstruct the full block from the CST (round-trip fidelity, not byte-identical).
4. `stm lineage --from <schema>` produces a correct directed graph of all mappings downstream of the named schema.
5. `stm find --tag <token>` returns every field carrying that token across all files.
6. All commands support `--json` for structured output.
7. Exit codes: 0 = success, 1 = not found / no results, 2 = parse error.

---

## Commands

### `stm summary [path]`

Print a compact overview of the entire workspace: all schemas, metrics, mappings, fragments, and transforms, with one line each.

```
$ stm summary

Schemas (4):
  customers          7 fields  [pii: email, phone]
  orders             5 fields
  dim_customer       9 fields  [scd type 2]  [pii: email, phone]
  fact_orders        6 fields  [fact]

Metrics (2):
  monthly_recurring_revenue  "MRR"   source: fact_subscriptions  grain: monthly
  customer_lifetime_value    "CLV"   source: fact_orders, dim_customer

Mappings (3):
  customer migration    legacy_sqlserver -> postgres_db      18 arrows
  opportunity enrichment  sfdc_opportunity + sfdc_account -> snowflake_opps  12 arrows
  order lines           commerce_order -> order_lines_parquet  6 arrows

Fragments (2):  address fields, audit fields
Transforms (3): clean email, to utc date, clean phone
```

`--compact`: omits field counts, PII callouts, and SCD annotations. Names only.

`--json`: structured JSON with one entry per top-level block.

---

### `stm schema <name> [--file <path>]`

Print the full declaration of a named schema: all fields, types, metadata, and notes. Nested `record`/`list` blocks are indented.

```
$ stm schema customers

schema customers (format parquet) {
  customer_id    UUID         (pk)
  name           VARCHAR(200) (required)
  email          VARCHAR(255) (format email, pii)
  status         VARCHAR(20)  (enum {active, suspended, closed})
  created_at     TIMESTAMPTZ  (required)
}
```

`--compact`: omit notes and NL-only metadata. Types and structural metadata only.

`--fields-only`: print just the field list — one line per field, name + type + key metadata tokens.

---

### `stm metric <name>`

Print the full declaration of a named metric: display label, metadata (source, grain, slice, filter), measure fields, and notes.

```
$ stm metric monthly_recurring_revenue

metric monthly_recurring_revenue "MRR" (
  source fact_subscriptions,
  grain monthly,
  slice {customer_segment, product_line, region},
  filter "status = 'active' AND is_trial = false"
) {
  value  DECIMAL(14,2)  (measure additive)

  note { "Sum of active subscription amounts, normalized to monthly." }
}
```

`--compact`: omit note blocks. Show metadata and measure fields only.

`--sources`: print only the source schema names (useful for lineage queries).

---

### `stm mapping <name>`

Print the full content of a named mapping block: source/target schemas, note blocks, and all arrows with their transform bodies.

`--compact`: print only the arrow list (source path → target path) with no transform bodies or notes.

`--arrows-only`: table of `src_path -> tgt_path` pairs, one per line.

---

### `stm find --tag <token> [--in schemas|mappings|metrics|fields]`

Find every place a vocabulary token appears in the workspace.

```
$ stm find --tag pii

customers.email          (pii)
customers.phone          (pii)
dim_customer.email       (pii)
orders.customer_email    (pii)
```

```
$ stm find --tag "scd type 2"

dim_customer  (scd type 2, natural_key customer_id)
```

Common token queries an LLM would make:
- `--tag pii` — all PII fields across the workspace
- `--tag pk` — all primary keys
- `--tag required` — all required fields
- `--tag encrypt` — all encrypted fields
- `--tag measure` — all measure fields in metrics
- `--tag "scd type 2"` — all SCD2 schemas

`--compact`: print only `schema.field` paths, no metadata context.

`--json`: array of `{ file, block, field, metadata }` objects.

---

### `stm lineage --from <schema> [--to <schema>] [--depth <n>]`

Walk the mapping graph and show what data flows into and out of a schema.

```
$ stm lineage --from legacy_sqlserver

legacy_sqlserver
  -> postgres_db        via mapping 'customer migration'
```

```
$ stm lineage --from fact_subscriptions --depth 2

fact_subscriptions
  <- (source for metric monthly_recurring_revenue)
  <- (source for metric customer_lifetime_value)
```

With `--to`: find the mapping chain(s) connecting two schemas.

```
$ stm lineage --from crm_extract --to dim_customer

crm_extract
  -> [mapping 'crm to staging'] -> staging_customer
  -> [mapping 'staging to dim']  -> dim_customer
```

`--compact`: print only the schema names and mapping names, no descriptions.

`--json`: DAG as `{ nodes: [...], edges: [{ from, to, via }] }`.

---

### `stm where-used <name>`

Find every mapping, metric, or schema that references a named schema, fragment, or transform.

```
$ stm where-used 'address fields'

fragment 'address fields' is spread into:
  schema customers    (lib/common.stm -> main.stm)
  schema suppliers    (lib/common.stm -> suppliers.stm)

$ stm where-used customers

schema customers appears as:
  source in mapping 'customer migration'   (main.stm)
  source in metric  'customer_lifetime_value'  (metrics.stm)
```

---

### `stm warnings [--questions]`

List all `//!` warning comments across the workspace, with the block they appear in.

```
$ stm warnings

main.stm:legacy_sqlserver.CUST_TYPE   //! some records have NULL
main.stm:legacy_sqlserver.EMAIL_ADDR  //! not validated — contains garbage
main.stm:legacy_sqlserver.CREATED_DATE //! stored as MM/DD/YYYY string
```

`--questions`: list `//? ` question/TODO comments instead.

---

### `stm context <description>`

**The LLM-first command.** Given a natural-language description of a task, emit the minimal set of STM blocks an LLM needs to perform that task — without the LLM having to know which schemas or mappings are relevant.

```
$ stm context "I need to add a new field to the customer schema and update the migration mapping"

Relevant blocks (3):

--- schema customers ---
[full schema output]

--- schema legacy_sqlserver ---
[full schema output]

--- mapping 'customer migration' ---
[--compact output]
```

Implementation strategy: keyword matching against block names, field names, note text, and metadata tokens. Not LLM-powered itself — pure text heuristics. The output is what you feed to the LLM, not generated by one.

`--compact`: apply `--compact` to all emitted blocks.

`--budget <n>`: stop adding blocks when estimated token count exceeds `n`. Prioritise schemas referenced in the description, then mappings, then metrics.

---

## Output Format

### Default (human/LLM readable text)

Compact STM-like syntax. Notes and NL strings are included by default; `--compact` strips them.

### `--json`

Structured JSON. Schema example:

```json
{
  "type": "schema",
  "name": "customers",
  "file": "examples/main.stm",
  "metadata": ["format parquet"],
  "fields": [
    { "name": "customer_id", "type": "UUID", "metadata": ["pk"] },
    { "name": "email", "type": "VARCHAR(255)", "metadata": ["format email", "pii"] }
  ]
}
```

Metric example:

```json
{
  "type": "metric",
  "name": "monthly_recurring_revenue",
  "displayLabel": "MRR",
  "file": "examples/metrics.stm",
  "metadata": {
    "source": ["fact_subscriptions"],
    "grain": "monthly",
    "slice": ["customer_segment", "product_line", "region"],
    "filter": "status = 'active' AND is_trial = false"
  },
  "fields": [
    { "name": "value", "type": "DECIMAL(14,2)", "metadata": ["measure", "additive"] }
  ]
}
```

---

## Architecture

```
stm CLI (Node.js or Rust)
  └── workspace loader
        reads all .stm files in tree, builds file index
  └── CST layer (tree-sitter-stm, Feature 08)
        parses each file into a CST
  └── index builder
        extracts all top-level blocks into an in-memory index:
        { schemas, metrics, mappings, fragments, transforms }
        builds reference graph for lineage and where-used queries
  └── command handlers
        each command queries the index, formats output
```

The index is rebuilt on each invocation (no daemon, no cache). For a realistic workspace (10–20 files), this is fast enough. Caching can be added later if needed.

The CST layer is the sole parser — no regex fallbacks. If a file has a parse error, it is reported with file/line and the file is skipped with a warning.

---

## Non-Goals

- Real-time file watching or incremental re-indexing (daemon mode).
- LLM-powered interpretation of metadata tokens (that is the LLM's job after receiving the sliced context).
- Import resolution across repositories or registries.
- Formatting or modifying STM files (`stm fmt` is a separate feature).
- Linting (`stm lint` is a separate feature).

---

## Implementation Language

Node.js, using the `tree-sitter` Node bindings to the Feature 08 grammar. This keeps the implementation in the same language as the grammar and avoids a second language dependency. A Rust rewrite can be considered later if performance becomes an issue.

Location: `tooling/stm-cli/`

Entry point: `tooling/stm-cli/src/index.js` (or `main.js`), exposed as `stm` via `package.json` `bin`.
