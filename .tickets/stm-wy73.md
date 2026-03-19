---
id: stm-wy73
status: in_progress
deps: []
links: []
created: 2026-03-19T19:07:06Z
type: feature
priority: 2
assignee: Thorben Louw
tags: [stm-cli, agent-tooling, graph]
---
# stm graph: workspace semantic graph export

Add a new `stm graph [path]` command that exports a complete workspace semantic graph as a single JSON artifact. This gives AI agents (and external tools) a one-shot view of the entire workspace topology — schemas, mappings, metrics, fragments, transforms, and all field-level data flow edges — without requiring multiple round-trip CLI calls.

## Motivation

The current CLI is designed for targeted, token-efficient queries (e.g. `stm arrows`, `stm lineage --from`). This works well for focused tasks, but whole-workspace reasoning — impact analysis, PII audit, coverage assessment, migration planning — requires the agent to compose many sequential calls, each adding latency and token overhead. A graph export collapses that into a single load.

The `stm lineage` command already builds an internal schema-level directed graph (`buildFullGraph` in lineage.js) using the workspace index. The `stm graph` command generalises and enriches this: it exposes the full workspace topology at both schema-level and field-level, with metadata, transform classification, NL content pointers, and file locations.

## Design

### Output structure (--json)

```json
{
  "version": 1,
  "generated": "2026-03-19T...",
  "workspace": "path/to/workspace",
  "stats": {
    "schemas": 12,
    "mappings": 5,
    "metrics": 3,
    "fragments": 2,
    "transforms": 1,
    "arrows": 47,
    "errors": 0
  },
  "nodes": [
    {
      "id": "crm::customers",
      "kind": "schema",
      "namespace": "crm",
      "file": "crm/pipeline.stm",
      "row": 5,
      "fields": [
        { "name": "id", "type": "INT", "tags": ["pk"] },
        { "name": "email", "type": "STRING(255)", "tags": ["pii"] }
      ],
      "note": "CRM customer master"
    },
    {
      "id": "crm_to_hub",
      "kind": "mapping",
      "namespace": null,
      "file": "pipeline.stm",
      "row": 20,
      "sources": ["crm::customers"],
      "targets": ["hub_customer"]
    },
    {
      "id": "monthly_revenue",
      "kind": "metric",
      "file": "metrics.stm",
      "row": 40,
      "sources": ["hub_customer"],
      "grain": "monthly",
      "slices": ["region", "segment"]
    }
  ],
  "edges": [
    {
      "from": "crm::customers.email",
      "to": "hub_customer.email_address",
      "mapping": "crm_to_hub",
      "classification": "structural",
      "transforms": ["trim", "lowercase", "validate_email"],
      "file": "pipeline.stm",
      "row": 25
    },
    {
      "from": null,
      "to": "hub_customer.created_at",
      "mapping": "crm_to_hub",
      "classification": "structural",
      "transforms": ["now_utc()"],
      "derived": true,
      "file": "pipeline.stm",
      "row": 30
    },
    {
      "from": "crm::customers.status",
      "to": "hub_customer.is_active",
      "mapping": "crm_to_hub",
      "classification": "nl",
      "nl_text": "Map `status` code to boolean...",
      "file": "pipeline.stm",
      "row": 27
    }
  ],
  "schema_edges": [
    { "from": "crm::customers", "to": "crm_to_hub", "role": "source" },
    { "from": "crm_to_hub", "to": "hub_customer", "role": "target" },
    { "from": "hub_customer", "to": "monthly_revenue", "role": "metric_source" }
  ],
  "warnings": [
    { "text": "Some records have NULL email", "file": "crm/pipeline.stm", "row": 8 }
  ],
  "unresolved_nl": [
    {
      "scope": "mapping crm_to_hub",
      "arrow": "-> derived_score",
      "text": "Calculate risk score from `credit_history` and `account_age`",
      "file": "pipeline.stm",
      "row": 32
    }
  ]
}
```

### Layers

The graph has two layers:

1. **Schema-level edges** (`schema_edges`): schema → mapping → schema → metric. This is the topology already built by `lineage.js:buildFullGraph()`, now exposed directly. Useful for high-level data flow diagrams and reachability queries.

2. **Field-level edges** (`edges`): source_schema.field → target_schema.field via a mapping, with transform classification, pipeline steps, NL text (for `nl`/`mixed` arrows), and derived-field flags. This is built from the existing `fieldArrows` index and `arrowRecords` in the workspace index.

### Output modes

- `--json` (primary): Full graph as JSON. This is the agent interface.
- Default (text): Human-readable summary — node counts, edge counts, and a compact adjacency list.
- `--compact`: Just the schema_edges layer as a flat adjacency list (for quick topology checks).
- `--dot`: Graphviz DOT format for visualisation. Schema-level only (field-level would be too dense). Optional / stretch goal.

### Filters

- `--schema-only`: Emit only schema_edges (no field-level edges). Smaller output for topology-only queries.
- `--namespace <ns>`: Filter to nodes within a namespace (plus cross-namespace edges).
- `--include-nl`: Include full NL text in edges (default: include). `--no-nl` to strip NL text and reduce size.

### Implementation approach

- Reuse the existing `buildIndex()` and `buildFullGraph()` infrastructure.
- Add a new `graph.js` command module under `src/commands/`.
- The field-level edge construction should reuse `buildFieldArrows` from `index-builder.js`, enriched with transform classification from the existing `arrowRecords` extraction.
- The `unresolved_nl` section surfaces all NL-classified arrows for agent interpretation.
- The `version` field allows future schema evolution without breaking consumers.

### Relationship to existing commands

- `stm lineage` remains the focused traversal tool (BFS/DFS from a starting node). `stm graph` is the full export.
- `stm summary` gives counts and names. `stm graph --json` gives the full topology with edges and metadata.
- `stm arrows` gives field-level arrows for a single field. `stm graph` gives all arrows across the workspace.

## Acceptance Criteria

### Core functionality
- [ ] `stm graph [path]` command exists and is registered in the CLI
- [ ] Default text output shows: node counts by kind, edge counts by classification, and a compact schema-level adjacency list
- [ ] `--json` outputs the full graph structure matching the schema described above (version, stats, nodes, edges, schema_edges, warnings, unresolved_nl)
- [ ] `--compact` outputs a minimal schema-level adjacency list (text format)
- [ ] Output JSON has a `version: 1` field for future schema evolution

### Nodes
- [ ] All schemas, mappings, metrics, fragments, and transforms appear as nodes
- [ ] Each node includes: id (namespace-qualified where applicable), kind, file, row
- [ ] Schema nodes include fields array with name, type, and tags
- [ ] Metric nodes include source schemas, grain, and slices
- [ ] Mapping nodes include sources and targets arrays
- [ ] Namespace-qualified names use the `ns::name` convention consistently

### Edges (field-level)
- [ ] Every arrow record in the workspace appears as a field-level edge
- [ ] Each edge includes: from (schema.field or null for derived), to (schema.field), mapping name, classification (structural/nl/mixed/none), file, row
- [ ] Structural arrows include a transforms array with pipeline step names
- [ ] NL and mixed arrows include nl_text with the verbatim NL content
- [ ] Derived arrows (no source) have `from: null` and `derived: true`

### Schema-level edges
- [ ] schema_edges captures the schema → mapping → schema → metric topology
- [ ] Each schema_edge includes from, to, and role (source/target/metric_source)
- [ ] NL backtick references that reference known schemas also appear as schema_edges (matching existing lineage.js behavior)

### Filters
- [ ] `--schema-only` omits field-level edges and field arrays on schema nodes
- [ ] `--namespace <ns>` filters nodes to a namespace (plus cross-namespace edges)
- [ ] `--no-nl` strips nl_text from edges (classification still present)

### Infrastructure
- [ ] Reuses existing buildIndex() and workspace parsing — no duplicate extraction logic
- [ ] Extracts and reuses buildFullGraph logic (refactored from lineage.js if needed, to avoid duplication)
- [ ] Handles workspaces with parse errors gracefully (errors counted in stats, valid content still exported)
- [ ] Handles empty workspaces (no .stm files) with a meaningful empty graph (zero counts, empty arrays)

### Testing
- [ ] Unit tests for graph construction from a known fixture workspace
- [ ] Test: nodes include all entity kinds (schema, mapping, metric, fragment, transform)
- [ ] Test: field-level edges match expected arrows with correct classification
- [ ] Test: schema-level edges match expected topology
- [ ] Test: --schema-only omits field-level data
- [ ] Test: --namespace filters correctly (includes cross-namespace edges)
- [ ] Test: --no-nl strips NL text but preserves classification
- [ ] Test: derived arrows have from=null and derived=true
- [ ] Test: namespace-qualified names are correct in nodes and edges
- [ ] Test: empty workspace produces valid empty graph JSON
- [ ] Test: workspace with parse errors still produces partial graph with error count
- [ ] Integration test: runs against examples/ directory and produces valid graph

### Documentation
- [ ] STM-CLI.md updated with graph command entry in the command table
- [ ] AI-AGENT-REFERENCE.md updated: graph command in the command reference, and a new workflow example showing single-load reasoning

