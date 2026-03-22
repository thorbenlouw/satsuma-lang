/**
 * graph.js — `satsuma graph` command
 *
 * Exports a complete workspace semantic graph as a single JSON artifact.
 * Gives AI agents (and external tools) a one-shot view of the entire
 * workspace topology — schemas, mappings, metrics, fragments, transforms,
 * and all field-level data flow edges.
 *
 * Flags:
 *   --json          full structured JSON output (primary agent interface)
 *   --compact       schema-level adjacency list only
 *   --schema-only   omit field-level edges and field arrays
 *   --namespace <ns> filter to nodes within a namespace
 *   --no-nl         strip NL text from edges
 */

import type { Command } from "commander";
import { resolve } from "node:path";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex } from "../index-builder.js";
import { buildFullGraph } from "../graph-builder.js";
import { expandEntityFields } from "../spread-expand.js";
import type { WorkspaceIndex } from "../types.js";
import type { FullGraph } from "../graph-builder.js";

interface GraphOpts {
  json?: boolean;
  compact?: boolean;
  schemaOnly?: boolean;
  namespace?: string;
  nl?: boolean;
}

interface SchemaEdge {
  from: string;
  to: string;
  role: string;
}

interface FieldEdge {
  from: string | null;
  to: string | null;
  mapping: string;
  classification: string;
  file: string;
  line: number;
  transforms?: string[];
  nl_text?: string;
  derived?: boolean;
}

interface WorkspaceGraph {
  version: number;
  generated: string;
  workspace: string;
  stats: {
    schemas: number;
    mappings: number;
    metrics: number;
    fragments: number;
    transforms: number;
    arrows: number;
    errors: number;
  };
  nodes: Array<Record<string, unknown>>;
  edges: FieldEdge[];
  schema_edges: SchemaEdge[];
  warnings: Array<{ text: string; file: string; line: number }>;
  unresolved_nl: Array<{ scope: string; arrow: string; text: string; file: string; line: number }>;
}

export function register(program: Command): void {
  program
    .command("graph [path]")
    .description("Export workspace semantic graph")
    .option("--json", "full structured JSON output")
    .option("--compact", "schema-level adjacency list only")
    .option("--schema-only", "omit field-level edges and field arrays")
    .option("--namespace <ns>", "filter to a namespace")
    .option("--no-nl", "strip NL text from edges")
    .action(async (pathArg: string | undefined, opts: GraphOpts) => {
      const root = pathArg ?? ".";
      let files: string[];
      try {
        files = await resolveInput(root);
      } catch (err: unknown) {
        console.error(`Error resolving path: ${(err as Error).message}`);
        process.exit(2);
      }

      if (files.length === 0) {
        // Empty workspace — output valid empty graph
        if (opts.json) {
          console.log(JSON.stringify(emptyGraph(root), null, 2));
        } else {
          console.log("Empty workspace — no .stm files found.");
        }
        return;
      }

      const parsedFiles = files.map((f) => parseFile(f));
      const index = buildIndex(parsedFiles);
      const schemaGraph = buildFullGraph(index);
      const graph = buildWorkspaceGraph(index, schemaGraph, root, opts);

      if (opts.json) {
        console.log(JSON.stringify(graph, null, 2));
      } else if (opts.compact) {
        printCompact(graph);
      } else {
        printDefault(graph);
      }

      if (index.totalErrors > 0) process.exit(2);
    });
}

// ── Graph construction ────────────────────────────────────────────────────────

function emptyGraph(root: string): WorkspaceGraph {
  return {
    version: 1,
    generated: new Date().toISOString(),
    workspace: resolve(root),
    stats: { schemas: 0, mappings: 0, metrics: 0, fragments: 0, transforms: 0, arrows: 0, errors: 0 },
    nodes: [],
    edges: [],
    schema_edges: [],
    warnings: [],
    unresolved_nl: [],
  };
}

/**
 * Build the full workspace graph output structure.
 */
function buildWorkspaceGraph(index: WorkspaceIndex, schemaGraph: FullGraph, root: string, opts: GraphOpts): WorkspaceGraph {
  const nsFilter = opts.namespace ?? null;
  const includeNl = opts.nl !== false; // --no-nl sets opts.nl to false
  const schemaOnly = opts.schemaOnly ?? false;

  // Build nodes
  const nodes: Array<Record<string, unknown>> = [];
  const includedNodeIds = new Set<string>();

  for (const [id, schema] of index.schemas) {
    if (nsFilter && schema.namespace !== nsFilter) continue;
    includedNodeIds.add(id);
    const node: Record<string, unknown> = {
      id,
      kind: "schema",
      namespace: schema.namespace ?? null,
      file: schema.file,
      line: schema.row + 1,
      note: schema.note ?? null,
    };
    if (!schemaOnly) {
      const spreadFields = expandEntityFields(schema, schema.namespace ?? null, index);
      node.fields = [...schema.fields, ...spreadFields].map((f) => ({
        name: f.name,
        type: f.type ?? null,
      }));
    }
    nodes.push(node);
  }

  for (const [id, mapping] of index.mappings) {
    if (nsFilter && mapping.namespace !== nsFilter) continue;
    includedNodeIds.add(id);
    nodes.push({
      id,
      kind: "mapping",
      namespace: mapping.namespace ?? null,
      file: mapping.file,
      line: mapping.row + 1,
      sources: mapping.sources,
      targets: mapping.targets,
    });
  }

  for (const [id, metric] of index.metrics) {
    if (nsFilter && metric.namespace !== nsFilter) continue;
    includedNodeIds.add(id);
    nodes.push({
      id,
      kind: "metric",
      namespace: metric.namespace ?? null,
      file: metric.file,
      line: metric.row + 1,
      sources: metric.sources,
      grain: metric.grain ?? null,
      slices: metric.slices ?? [],
    });
  }

  for (const [id, fragment] of index.fragments) {
    if (nsFilter && fragment.namespace !== nsFilter) continue;
    includedNodeIds.add(id);
    const fragNode: Record<string, unknown> = {
      id,
      kind: "fragment",
      namespace: fragment.namespace ?? null,
      file: fragment.file,
      line: fragment.row + 1,
    };
    if (!schemaOnly) {
      fragNode.fields = fragment.fields.map((f) => ({
        name: f.name,
        type: f.type ?? null,
      }));
    }
    nodes.push(fragNode);
  }

  for (const [id, transform] of index.transforms) {
    if (nsFilter && transform.namespace !== nsFilter) continue;
    includedNodeIds.add(id);
    nodes.push({
      id,
      kind: "transform",
      namespace: transform.namespace ?? null,
      file: transform.file,
      line: transform.row + 1,
    });
  }

  // Build schema-level edges from the directed graph
  const schemaEdges = buildSchemaEdges(index, schemaGraph, includedNodeIds, nsFilter);

  // Add fragment spread edges: fragment -> schema that spreads it
  for (const [id, schema] of index.schemas) {
    if (nsFilter && schema.namespace !== nsFilter) continue;
    if (!schema.hasSpreads) continue;
    for (const spreadName of (schema.spreads ?? [])) {
      // Resolve fragment name in the schema's namespace context
      const fragKey = [...index.fragments.keys()].find((k) => {
        const bare = k.includes("::") ? k.split("::")[1] : k;
        return bare === spreadName || k === spreadName;
      });
      if (fragKey && includedNodeIds.has(fragKey)) {
        schemaEdges.push({ from: fragKey, to: id, role: "fragment_spread" });
      }
    }
  }

  // Build field-level edges from arrow records
  let fieldEdges: FieldEdge[] = [];
  const unresolvedNl: Array<{ scope: string; arrow: string; text: string; file: string; line: number }> = [];

  // Always build field edges (needed for --schema-only aggregation too)
  const result = buildFieldEdges(index, includedNodeIds, nsFilter, includeNl);

  if (schemaOnly) {
    // Aggregate field-level edges into schema-level edges by extracting
    // the schema prefix from dotted field paths and deduplicating.
    const seen = new Set<string>();
    for (const edge of result.edges) {
      const fromSchema = edge.from ? edge.from.split(".")[0] : null;
      const toSchema = edge.to ? edge.to.split(".")[0] : null;
      if (fromSchema && toSchema) {
        const key = `${fromSchema}->${toSchema}:${edge.mapping}`;
        if (!seen.has(key)) {
          seen.add(key);
          fieldEdges.push({
            from: fromSchema,
            to: toSchema,
            mapping: edge.mapping,
            classification: edge.classification,
            file: edge.file,
            line: edge.line,
          });
        }
      }
    }
    // For mappings with no field edges (e.g. derived-only), add schema-level
    // edges from the declared source/target lists.
    const mappingsWithEdges = new Set(fieldEdges.map((e) => e.mapping));
    for (const [, mapping] of index.mappings) {
      if (nsFilter && mapping.namespace !== nsFilter) continue;
      const mappingName = mapping.name ?? "";
      if (mappingName && mappingsWithEdges.has(mappingName)) continue;
      for (const src of mapping.sources) {
        for (const tgt of mapping.targets) {
          const key = `${src}->${tgt}:${mappingName}`;
          if (!seen.has(key)) {
            seen.add(key);
            fieldEdges.push({
              from: src,
              to: tgt,
              mapping: mappingName,
              classification: "none",
              file: mapping.file,
              line: mapping.row + 1,
            });
          }
        }
      }
    }
  } else {
    fieldEdges = result.edges;
  }
  unresolvedNl.push(...result.unresolvedNl);

  // Count arrows (raw field arrows, not aggregated)
  const arrowCount = result.edges.length;

  return {
    version: 1,
    generated: new Date().toISOString(),
    workspace: resolve(root),
    stats: {
      schemas: [...index.schemas.values()].filter((s) => !nsFilter || s.namespace === nsFilter).length,
      mappings: [...index.mappings.values()].filter((m) => !nsFilter || m.namespace === nsFilter).length,
      metrics: [...index.metrics.values()].filter((m) => !nsFilter || m.namespace === nsFilter).length,
      fragments: [...index.fragments.values()].filter((f) => !nsFilter || f.namespace === nsFilter).length,
      transforms: [...index.transforms.values()].filter((t) => !nsFilter || t.namespace === nsFilter).length,
      arrows: arrowCount,
      errors: index.totalErrors,
    },
    nodes,
    edges: fieldEdges,
    schema_edges: schemaEdges,
    warnings: index.warnings.map((w) => ({ text: w.text, file: w.file, line: w.row + 1 })),
    unresolved_nl: includeNl ? unresolvedNl : [],
  };
}

/**
 * Build schema-level edges from the directed graph.
 * Each edge has: from, to, role (source/target/metric_source).
 */
function buildSchemaEdges(index: WorkspaceIndex, schemaGraph: FullGraph, includedNodeIds: Set<string>, nsFilter: string | null): SchemaEdge[] {
  const edges: SchemaEdge[] = [];

  for (const [mappingName, mapping] of index.mappings) {
    if (nsFilter && mapping.namespace !== nsFilter) continue;

    for (const src of mapping.sources) {
      // Include cross-namespace edges when filtering
      if (!nsFilter || includedNodeIds.has(src) || includedNodeIds.has(mappingName)) {
        edges.push({ from: src, to: mappingName, role: "source" });
      }
    }
    for (const tgt of mapping.targets) {
      if (!nsFilter || includedNodeIds.has(tgt) || includedNodeIds.has(mappingName)) {
        edges.push({ from: mappingName, to: tgt, role: "target" });
      }
    }
  }

  // metric edges
  for (const [metricName, srcSchemas] of index.referenceGraph.metricsReferences) {
    const metric = index.metrics.get(metricName);
    if (nsFilter && metric?.namespace !== nsFilter) continue;

    for (const src of srcSchemas) {
      if (!nsFilter || includedNodeIds.has(src) || includedNodeIds.has(metricName)) {
        edges.push({ from: src, to: metricName, role: "metric_source" });
      }
    }
  }

  // NL backtick schema refs (matching lineage.js behavior via schemaGraph)
  // These are already captured in the schemaGraph edges — find any that aren't
  // already covered by mapping source/target declarations
  const declaredEdges = new Set(edges.map((e) => `${e.from}->${e.to}`));
  for (const [src, targets] of schemaGraph.edges) {
    for (const tgt of targets) {
      const key = `${src}->${tgt}`;
      if (!declaredEdges.has(key)) {
        const srcNode = schemaGraph.nodes.get(src);
        const tgtNode = schemaGraph.nodes.get(tgt);
        if (srcNode?.type === "schema" && tgtNode?.type === "mapping") {
          if (!nsFilter || includedNodeIds.has(src) || includedNodeIds.has(tgt)) {
            edges.push({ from: src, to: tgt, role: "source" });
          }
        }
      }
    }
  }

  return edges;
}

/**
 * Qualify a field path with its schema name, handling edge cases:
 *  - Leading dot (nested field, e.g. ".PHONE_TYPE") → "schema.PHONE_TYPE"
 *  - Already schema-qualified (multi-source, e.g. "crm.customer_id") → unchanged
 *    when the prefix matches a known schema
 *  - Simple field name → "schema.field"
 */
function qualifyField(field: string, schemas: string[]): string {
  if (schemas.length === 0) return field;

  // Nested field: strip leading dot, prepend first schema
  if (field.startsWith(".")) {
    return `${schemas[0]}.${field.slice(1)}`;
  }

  // Multi-source: field may already be schema-qualified (e.g. "crm.customer_id")
  const dotIdx = field.indexOf(".");
  if (dotIdx > 0) {
    const prefix = field.slice(0, dotIdx);
    if (schemas.includes(prefix)) {
      // Already qualified — don't double-prefix
      return field;
    }
    // Check if prefix matches the bare name of a namespace-qualified schema
    for (const s of schemas) {
      const nsIdx = s.indexOf("::");
      const bare = nsIdx !== -1 ? s.slice(nsIdx + 2) : s;
      if (bare === prefix) return field;
    }
  }

  return `${schemas[0]}.${field}`;
}

/**
 * Build field-level edges from arrow records in the workspace index.
 */
function buildFieldEdges(index: WorkspaceIndex, includedNodeIds: Set<string>, nsFilter: string | null, includeNl: boolean): { edges: FieldEdge[]; unresolvedNl: Array<{ scope: string; arrow: string; text: string; file: string; line: number }> } {
  const edges: FieldEdge[] = [];
  const unresolvedNl: Array<{ scope: string; arrow: string; text: string; file: string; line: number }> = [];

  // Iterate all arrow records via the fieldArrows index
  // But fieldArrows duplicates records under multiple keys, so iterate raw arrow records instead.
  // We need to reconstruct from the index's mappings + arrow records.
  const seen = new Set<string>();

  for (const [_key, records] of index.fieldArrows) {
    for (const record of records) {
      // Deduplicate — same arrow record may appear under multiple keys
      const dedupKey = `${record.file}:${record.line}:${record.target}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const mappingKey = record.namespace
        ? `${record.namespace}::${record.mapping}`
        : (record.mapping ?? "");

      if (nsFilter) {
        const mapping = index.mappings.get(mappingKey);
        if (mapping?.namespace !== nsFilter) continue;
      }

      // Resolve source and target schema names
      const mapping = index.mappings.get(mappingKey);
      const sourceSchemas = mapping?.sources ?? [];
      const targetSchemas = mapping?.targets ?? [];

      const fromField = record.source
        ? qualifyField(record.source, sourceSchemas)
        : null;
      const toField = record.target
        ? qualifyField(record.target, targetSchemas)
        : null;

      const edge: FieldEdge = {
        from: fromField,
        to: toField,
        mapping: mappingKey,
        classification: record.classification,
        file: record.file,
        line: record.line + 1,
      };

      if (record.classification === "structural" || record.classification === "mixed") {
        edge.transforms = record.steps
          .filter((s) => s.type !== "nl_string" && s.type !== "multiline_string")
          .map((s) => s.text);
      }

      if ((record.classification === "nl" || record.classification === "mixed") && includeNl) {
        const nlSteps = record.steps.filter(
          (s) => s.type === "nl_string" || s.type === "multiline_string",
        );
        if (nlSteps.length > 0) {
          edge.nl_text = nlSteps.map((s) => s.text).join(" ");
        }
      }

      if (record.derived) {
        edge.derived = true;
      }

      edges.push(edge);

      // Track unresolved NL for the output section
      if (record.classification === "nl" || record.classification === "mixed") {
        const nlSteps = record.steps.filter(
          (s) => s.type === "nl_string" || s.type === "multiline_string",
        );
        if (nlSteps.length > 0) {
          unresolvedNl.push({
            scope: `mapping ${mappingKey}`,
            arrow: `-> ${record.target ?? "?"}`,
            text: nlSteps.map((s) => s.text).join(" "),
            file: record.file,
            line: record.line + 1,
          });
        }
      }
    }
  }

  return { edges, unresolvedNl };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function printDefault(graph: WorkspaceGraph): void {
  console.log(`Satsuma Graph — ${graph.workspace}`);
  console.log();

  const s = graph.stats;
  console.log("Nodes:");
  if (s.schemas > 0)    console.log(`  schemas:    ${s.schemas}`);
  if (s.mappings > 0)   console.log(`  mappings:   ${s.mappings}`);
  if (s.metrics > 0)    console.log(`  metrics:    ${s.metrics}`);
  if (s.fragments > 0)  console.log(`  fragments:  ${s.fragments}`);
  if (s.transforms > 0) console.log(`  transforms: ${s.transforms}`);
  console.log();

  console.log("Edges:");
  console.log(`  schema-level: ${graph.schema_edges.length}`);
  console.log(`  field-level:  ${graph.edges.length}`);

  // Classification breakdown
  const byClass: Record<string, number> = {};
  for (const e of graph.edges) {
    byClass[e.classification] = (byClass[e.classification] ?? 0) + 1;
  }
  for (const [cls, count] of Object.entries(byClass)) {
    console.log(`    ${cls}: ${count}`);
  }
  console.log();

  if (s.errors > 0) {
    console.log(`Parse errors: ${s.errors}`);
    console.log();
  }

  // Compact adjacency list
  if (graph.schema_edges.length > 0) {
    console.log("Schema topology:");
    const adj = new Map<string, string[]>();
    for (const e of graph.schema_edges) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(`${e.to} [${e.role}]`);
    }
    for (const [src, targets] of adj) {
      console.log(`  ${src} -> ${targets.join(", ")}`);
    }
  }
}

function printCompact(graph: WorkspaceGraph): void {
  for (const e of graph.schema_edges) {
    console.log(`${e.from} -> ${e.to}  [${e.role}]`);
  }
}
