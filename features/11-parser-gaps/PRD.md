# Feature 11 — Parser Gaps from Example Corpus

> **Status: COMPLETED** (2026-03-18). All `examples/*.stm` files parse with zero errors. 190/190 corpus tests pass.

## Goal

Close the remaining tree-sitter grammar gaps exposed by the current `examples/` corpus so the parser matches the STM v2 spec and the canonical examples we want to preserve.

This feature is explicitly parser-first: each gap should be turned into targeted corpus coverage before grammar changes land.

---

## Problem

The current parser already handles the core STM v2 block structure, but it still fails on multiple examples that the spec treats as canonical. The failures are not random; they cluster around a small set of unsupported constructs:

- richer metadata values
- richer path syntax
- richer mapping metadata and source declarations
- richer pipeline steps and token-call arguments
- fragment spreads using multi-word names

As long as these gaps remain, downstream tooling will either reject valid STM or silently recover into misleading CST shapes.

---

## Inventory Summary

Example files scanned on 2026-03-18 with `./scripts/tree-sitter-local.sh parse`:

- Clean: `examples/common.stm`
- Clean: `examples/lookups/finance.stm`
- Clean: `examples/multi-source-hub.stm`
- Parse errors: `examples/db-to-db.stm`
- Parse errors: `examples/edi-to-json.stm`
- Parse errors: `examples/lib/sfdc_fragments.stm`
- Parse errors: `examples/metrics.stm`
- Parse errors: `examples/multi-source-join.stm`
- Parse errors: `examples/protobuf-to-parquet.stm`
- Parse errors: `examples/sfdc_to_snowflake.stm`
- Parse errors: `examples/xml-to-parquet.stm`

The failures reduce to the categories below.

---

## Gap Categories

### 1. Richer metadata values

The grammar currently limits metadata values too aggressively. It handles bare identifiers and strings, but not the richer scalar and path forms used in the spec and examples.

Observed examples:

- Numeric defaults: `(default 0)` in `db-to-db.stm`, `multi-source-join.stm`
- Boolean defaults: `(default false)` in `examples/lib/sfdc_fragments.stm`
- Quoted defaults: `(default "USD")` in `examples/multi-source-join.stm`
- Dotted refs: `(ref addresses.id)`, `(ref crm_customers.customer_id)`, `(ref sfdc_account.Id)`
- Dotted formats: `(format E.164)`
- Namespace metadata: `(namespace ord "http://...")`
- Filter metadata: `(filter SHPRFQUAL == "SRN")`
- Tag numbers: `(tag 1)`
- Decimal mapping metadata values: `(error_threshold 0.02)`

Primary grammar limitations:

- metadata values do not allow numbers, booleans, decimals, dotted paths, or two-part values like `namespace ord "uri"`
- filter expressions are being tokenized as broken key/value pairs instead of captured structurally

Representative corpus tests to add:

```stm
schema customer {
  loyalty_points INT (default 0)
  is_deleted BOOLEAN (default false)
  currency CHAR(3) (default "USD")
  address_id UUID (ref addresses.id)
  phone VARCHAR(20) (format E.164)
}
```

```stm
schema xml_order (
  format xml,
  namespace ord "http://example.com/order",
  namespace com "http://example.com/common"
) {}
```

```stm
list ShipmentRefs (filter SHPRFQUAL == "SRN") {
  SHIPREF CHAR(70)
}
```

```stm
field STRING (tag 1)
mapping 'session aggregation' (error_threshold 0.02) {}
```

Spec status: strongly spec-backed.

### 2. Enum entries with quoted names

`enum { ... }` currently accepts bare identifiers only. The examples use quoted enum members where labels contain spaces.

Observed example:

- `enum {Prospecting, Qualification, "Value Prop", Closed_Won, Closed_Lost}` in `examples/sfdc_to_snowflake.stm`

Representative corpus test:

```stm
StageName PICKLIST (enum {Prospecting, Qualification, "Value Prop", Closed_Won})
```

Spec status: example-backed and present in the canonical spec example.

### 3. Multi-word fragment and transform spreads

The spec allows spread syntax such as `...audit fields` and `...clean email`, but the grammar currently only accepts a single identifier or quoted label after `...`.

Observed examples:

- `...audit fields` in `examples/multi-source-join.stm`
- `...sfdc address` in `examples/lib/sfdc_fragments.stm`
- Spec examples also show `...clean email` and `...to utc date`

Representative corpus tests:

```stm
fragment 'audit fields' {
  created_at TIMESTAMPTZ
}

schema users {
  user_id UUID (pk)
  ...audit fields
}
```

```stm
transform 'clean email' {
  trim | lowercase
}

EMAIL_ADDR -> email { ...clean email }
```

Spec status: strongly spec-backed.

### 4. Mapping body ordering

The grammar currently requires `source {}` and `target {}` to appear before all other mapping-body items. The spec examples allow a leading `note {}` before `source` and `target`.

Observed example:

- Leading `note {}` in `examples/db-to-db.stm`

Representative corpus test:

```stm
mapping 'customer migration' {
  note {
    "Assumptions for the mapping."
  }

  source { `legacy_sqlserver` }
  target { `postgres_db` }
}
```

Spec status: spec-backed, despite the earlier “basic structure” section showing `source`/`target` first.

### 5. Annotated source entries inside `source {}`

The multi-source join example annotates individual source entries with per-source metadata:

```stm
source {
  `crm_customers` (filter "email NOT LIKE '%@test.internal'")
  `order_transactions` (filter "status IN ('completed', 'refunded')")
}
```

The current grammar only allows raw refs or strings inside `source {}`.

Representative corpus test:

```stm
mapping 'customer 360' {
  source {
    `crm_customers` (filter "email NOT LIKE '%@test.internal'")
    `order_transactions` (filter "status IN ('completed', 'refunded')")
    "Join crm_customers to order_transactions on crm_customers.customer_id = order_transactions.customer_id"
  }
  target { `customer_360` }
}
```

Spec status: example-backed, but not yet clearly specified in prose. This likely needs a parser change and a spec clarification.

### 6. Richer mapping-level metadata

Mapping metadata currently fails on vocabulary items that are valid in examples:

- `flatten \`Order.LineItems[]\`` in `examples/xml-to-parquet.stm`
- `group_by session_id, on_error log, error_threshold 0.02` in `examples/protobuf-to-parquet.stm`

Representative corpus tests:

```stm
mapping 'order lines' (flatten `Order.LineItems[]`) {
  source { `commerce_order` }
  target { `order_lines_parquet` }
}
```

```stm
mapping 'session aggregation' (group_by session_id, on_error log, error_threshold 0.02) {
  source { `commerce_event_pb` }
  target { `commerce_session_parquet` }
}
```

Spec status: `flatten` is spec-backed; the aggregation-oriented metadata is example-backed and should be preserved.

### 7. Repeated path segments in the middle of a path

The current path grammar only accepts an optional `[]` suffix at the very end of the path. Several examples require repeated segments before later path segments.

Observed examples:

- `Order.LineItems[].SKU`
- `Order.LineItems[].LineNumber`
- `CartLines[].unit_price`
- `ShipmentHeader.asnDetails[].containers`

Representative corpus tests:

```stm
Order.LineItems[].SKU -> sku
CartLines[].unit_price -> gross_merchandise_value
-> ShipmentHeader.asnDetails[].containers { "No source data available." }
```

Spec status: strongly example-backed and required for real nested mappings.

### 8. Arithmetic pipeline steps

The grammar currently accepts token calls and strings in pipelines but not arithmetic steps such as `* 100`.

Observed example:

- `coalesce(0) | * 100 | round` in `examples/db-to-db.stm`

Representative corpus test:

```stm
CREDIT_LIMIT -> credit_limit_cents { coalesce(0) | * 100 | round }
```

Spec status: agent reference explicitly documents `* N`, `/ N`, `+ N`, `- N`.

### 9. Richer token-call arguments

Token-call args currently reject dotted paths and are brittle around algorithm-like tokens.

Observed example:

- `encrypt(AES-256-GCM, secrets.tax_encryption_key)` in `examples/db-to-db.stm`

Representative corpus test:

```stm
TAX_ID -> tax_identifier_encrypted {
  encrypt(AES-256-GCM, secrets.tax_encryption_key)
}
```

Spec status: strongly spec-backed.

### 10. Metric metadata with multi-source `source { ... }`

Metric metadata currently misparses `source {a, b}` forms used in multiple examples.

Observed examples:

- `examples/metrics.stm`

Representative corpus test:

```stm
metric churn_rate (
  source {fact_subscriptions, dim_customer},
  grain monthly,
  slice {segment, region}
) {
  value DECIMAL(5,4) (measure non_additive)
}
```

Spec status: strongly spec-backed.

### 11. Adjacent NL strings inside `note {}`

One example uses two adjacent strings in a single `note {}` block:

```stm
note {
  "Sessions that reached checkout but did not result in a placed order, "
  "divided by all sessions that reached checkout."
}
```

Observed example:

- `examples/metrics.stm`

This is not clearly documented in the spec today. We need an explicit decision:

- support adjacent string concatenation in `note {}`
- or normalize the example corpus to use one string or a `"""` block

Representative decision test:

```stm
note {
  "part one"
  "part two"
}
```

Spec status: example-backed only; requires clarification before parser work.

### 12. `import` declarations

The parser does not support `import { ... } from "..."` statements. These are clearly spec-backed and used extensively in the feature 06 examples (Kimball and Data Vault).

Observed examples:

- `import { address_fields } from "common.stm"` in `features/06-data-modelling-with-stm/example_kimball/dim-customer.stm`
- `import { channel_codes } from "common.stm"` in `features/06-data-modelling-with-stm/example_kimball/fact-sales.stm`
- `import { hub_customer, sat_customer_demographics } from "hub-customer.stm"` in `features/06-data-modelling-with-stm/example_datavault/mart-customer-360.stm`

Representative corpus test:

```stm
import { address_fields } from "common.stm"
import { channel_codes } from "common.stm"
```

Spec status: strongly spec-backed — `STM-V2-SPEC.md` defines import syntax explicitly.

### 13. `ref` with `on` join clause in schema metadata

The feature 06 Kimball examples use `ref dim_X on field` inside schema metadata to declare foreign-key joins. The parser does not support the `on <field>` clause after a `ref` metadata value.

Observed examples:

- `ref dim_customer on customer_id` in `features/06-data-modelling-with-stm/example_kimball/fact-sales.stm`
- `ref dim_product on sku` in `features/06-data-modelling-with-stm/example_kimball/fact-sales.stm`
- `ref dim_store on store_id` in `features/06-data-modelling-with-stm/example_kimball/fact-sales.stm`
- `ref dim_date on transaction_date` in `features/06-data-modelling-with-stm/example_kimball/fact-sales.stm`

Representative corpus test:

```stm
schema fact_sales (
  fact,
  grain {transaction_id, line_number},
  ref dim_customer on customer_id,
  ref dim_product on sku
) {
  transaction_id VARCHAR(30)
}
```

Spec status: example-backed only (feature 06 examples); not yet in spec prose. Needs spec clarification.

---

## CLI Bugs Found During Exploratory Testing

These are not parser gaps but CLI extraction and composition bugs that affect downstream commands.

### CLI-1. Source/target refs include backtick delimiters

`extractMappings` stores source and target schema names with their backtick delimiters intact (e.g., `` `legacy_sqlserver` `` instead of `legacy_sqlserver`). Since schemas are indexed without backticks, this breaks:

- **`lineage`** — graph edges use backtick-quoted names, graph nodes use unquoted names; no edges are ever traversed.
- **`where-used`** — `usedByMappings` keys include backticks, so `where-used analytics_db` finds no references even though `analytics_db` is a mapping target.
- **`validate`** semantic checks — all mapping source/target refs produce false `undefined-ref` warnings.

Reproduction:

```bash
stm lineage --from crm_system examples/     # shows no downstream edges
stm where-used analytics_db examples/       # "No references found"
stm validate examples/                       # false undefined-ref warnings for all mappings
```

### CLI-2. Multi-source annotated entries pollute source refs

For mappings with annotated source entries (e.g., `customer 360` in `multi-source-join.stm`), `mapping.sources` includes raw text with filter metadata and NL join descriptions instead of just schema names.

Reproduction:

```bash
# mapping.sources for 'customer 360' contains:
#   '`crm_customers`       (filter "email NOT LIKE \'%@test.internal\'")'
#   '"Join crm_customers to order_transactions on ..."'
# instead of just ['crm_customers', 'order_transactions', 'support_tickets']
```

---

## Proposed Work Order

1. Add corpus tests for spec-backed gaps first.
2. Extend shared metadata parsing so schema, field, mapping, and metric metadata improve together.
3. Extend path parsing to support repeated path segments.
4. Extend pipeline parsing for arithmetic steps and richer token-call args.
5. Add explicit coverage for fragment/transform spreads with multi-word labels.
6. Resolve the two ambiguous items:
   - annotated source entries
   - adjacent strings in `note {}`

---

## Success Criteria

This feature is complete when:

1. All files under `examples/` parse without `ERROR` nodes.
2. Every gap category above has at least one focused corpus test.
3. Each grammar change is backed by a fixture from the example corpus or a reduced reproduction case.
4. Ambiguous example-only constructs are either:
   - added to the spec and parser, or
   - removed from the examples with an explicit rationale.

---

## Non-Goals

- Semantic validation of filters, refs, namespaces, or mapping logic.
- Normalizing the entire spec language around every new vocabulary token.
- Parser support for constructs not exercised by the spec or example corpus.
