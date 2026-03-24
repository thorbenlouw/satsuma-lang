# LLM Guidelines: Reports and ML Models Metadata Conventions

These guidelines tell an LLM how to interpret the free-form metadata tokens used in Satsuma files that document reports, dashboards, and ML models as pipeline consumers. None of these tokens are reserved keywords or enforced by the Satsuma grammar — they are **vocabulary conventions** that carry meaning by agreement.

## Core Principle

When you see metadata tokens like `report`, `model`, `source`, `tool`, `registry` in a schema's `( )` block, they communicate that this schema represents a **pipeline consumer** — an end-point that reads from upstream schemas but is not itself a source for further transformations. Your job is to:

1. **Recognise the consumer role** — `report` and `model` schemas are leaf nodes in the lineage graph
2. **Trace source dependencies** — `source {schema1, schema2}` declares which upstream schemas feed this consumer
3. **Understand field semantics** — fields on a `report` are visible measures/dimensions; fields on a `model` are features and outputs
4. **Support impact analysis** — when an upstream column changes, follow the `source` edges to identify affected consumers

## How `report` and `model` Schemas Differ from Regular Schemas

### Regular schemas

- Represent data structures (tables, files, messages)
- May appear on either side of a mapping — as source, target, or both
- Participate in the middle of the lineage graph

### Consumer schemas (`report` / `model`)

- Represent **what people or systems actually use** — dashboards, reports, ML models, API endpoints
- Appear as **leaf nodes** — they consume data but do not produce data for further schemas
- Declare dependencies via `source {schemas}` in metadata rather than through `mapping` blocks
- Fields describe the **consumer's interface**, not a storage structure:
  - On a `report`: the measures, dimensions, and filters visible to users
  - On a `model`: the input features and the output prediction or score

### Key distinction

A regular schema says "this data exists." A consumer schema says "this data is used here, by these people, on this platform, on this schedule."

---

## How `source {schemas}` Maps to Lineage Edges

The `source` token is the mechanism that connects consumers to the rest of the lineage graph.

**Rule:** Every schema name listed in `source {A, B, C}` creates a directed lineage edge from that upstream schema to this consumer.

**Example:**
```
schema weekly_sales_dashboard (report, source {fact_orders, dim_product}) { ... }
```

This creates two lineage edges:
- `fact_orders` -> `weekly_sales_dashboard`
- `dim_product` -> `weekly_sales_dashboard`

**Transitive lineage:** If `fact_orders` itself has sources (declared via mappings or its own metadata), the full lineage chain is: raw sources -> staging -> `fact_orders` -> `weekly_sales_dashboard`. The `source` token completes the last mile.

**Cross-file references:** The schema names in `source {}` may be defined in other `.stm` files. When resolving lineage across a multi-file platform, treat `source` references the same way you would treat `import` references — they are namespace-qualified when namespaces are in use.

---

## Dependency Documentation and Impact Analysis

### Generating dependency documentation

When asked to document dependencies for a consumer schema:

1. Read the `source {schemas}` list to identify direct upstream dependencies
2. For each source schema, check whether it is a regular schema, a fact, a dimension, or itself a consumer (consumer-to-consumer chains are valid but unusual)
3. List the fields on the consumer and, where `note` metadata describes the derivation, trace each field back to its source column
4. If `tool` metadata is present, include the platform and asset identifier in the documentation

### Generating impact analysis

When asked "what breaks if column X in schema Y changes?":

1. Find all consumer schemas that list Y in their `source {}` metadata
2. Check the consumer's fields — do any `note` descriptions reference column X?
3. If `tool` metadata is present, flag the specific dashboard or model that would be affected
4. Report the consumer name, platform, owner (if declared), and affected fields

### Generating operational summaries

When asked to summarise a consumer:

1. State the consumer type (`report` or `model`)
2. List source dependencies
3. State the platform (`tool`) and schedule (`refresh schedule`) if present
4. For models, note the registry and any promotion criteria from `note` metadata
5. For reports, note the audience and access restrictions from `classification` or `note` metadata

---

## Composition with Governance Tokens

Consumer schemas compose freely with all standard governance vocabulary tokens:

| Token | Meaning on a consumer |
|-------|----------------------|
| `classification "<level>"` | Sensitivity of the consumer's output (e.g., "CONFIDENTIAL" for a risk dashboard) |
| `retention "<period>"` | How long consumer outputs or snapshots are retained |
| `owner "<team>"` | Team responsible for the consumer |
| `pii` | On a field: this consumer exposes personally identifiable information |
| `encrypt` | On a field: the consumer's output includes encrypted data |

**Why this matters:** Governance policies often apply differently to consumers than to raw data. A column marked `pii` in the source may flow through to a dashboard visible to a broad audience — the `pii` annotation on the consumer's field makes this exposure explicit.

When generating compliance reports, treat `report` and `model` schemas as the final exposure points for sensitive data. If a `pii` field appears on a consumer schema, it means personally identifiable information is visible to the consumer's audience.
