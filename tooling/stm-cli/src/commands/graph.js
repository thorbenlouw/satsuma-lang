/**
 * graph.js — `stm graph` command
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

import { resolve } from "node:path";
import { resolveInput } from "../workspace.js";
import { parseFile } from "../parser.js";
import { buildIndex } from "../index-builder.js";
import { buildFullGraph } from "../graph-builder.js";

/** @param {import('commander').Command} program */
export function register(program) {
  program
    .command("graph [path]")
    .description("Export workspace semantic graph")
    .option("--json", "full structured JSON output")
    .option("--compact", "schema-level adjacency list only")
    .option("--schema-only", "omit field-level edges and field arrays")
    .option("--namespace <ns>", "filter to a namespace")
    .option("--no-nl", "strip NL text from edges")
    .action(async (pathArg, opts) => {
      const root = pathArg ?? ".";
      let files;
      try {
        files = await resolveInput(root);
      } catch (err) {
        console.error(`Error resolving path: ${err.message}`);
        process.exit(1);
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
    });
}

// ── Graph construction ────────────────────────────────────────────────────────

function emptyGraph(root) {
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
function buildWorkspaceGraph(index, schemaGraph, root, opts) {
  const nsFilter = opts.namespace ?? null;
  const includeNl = opts.nl !== false; // --no-nl sets opts.nl to false
  const schemaOnly = opts.schemaOnly ?? false;

  // Build nodes
  const nodes = [];
  const includedNodeIds = new Set();

  for (const [id, schema] of index.schemas) {
    if (nsFilter && schema.namespace !== nsFilter) continue;
    includedNodeIds.add(id);
    const node = {
      id,
      kind: "schema",
      namespace: schema.namespace ?? null,
      file: schema.file,
      row: schema.row,
      note: schema.note ?? null,
    };
    if (!schemaOnly) {
      node.fields = schema.fields.map((f) => ({
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
      row: mapping.row,
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
      row: metric.row,
      sources: metric.sources,
      grain: metric.grain ?? null,
      slices: metric.slices ?? [],
    });
  }

  for (const [id, fragment] of index.fragments) {
    if (nsFilter && fragment.namespace !== nsFilter) continue;
    includedNodeIds.add(id);
    nodes.push({
      id,
      kind: "fragment",
      namespace: fragment.namespace ?? null,
      file: fragment.file,
      row: fragment.row,
    });
  }

  for (const [id, transform] of index.transforms) {
    if (nsFilter && transform.namespace !== nsFilter) continue;
    includedNodeIds.add(id);
    nodes.push({
      id,
      kind: "transform",
      namespace: transform.namespace ?? null,
      file: transform.file,
      row: transform.row,
    });
  }

  // Build schema-level edges from the directed graph
  const schemaEdges = buildSchemaEdges(index, schemaGraph, includedNodeIds, nsFilter);

  // Build field-level edges from arrow records
  let fieldEdges = [];
  const unresolvedNl = [];

  if (!schemaOnly) {
    const result = buildFieldEdges(index, includedNodeIds, nsFilter, includeNl);
    fieldEdges = result.edges;
    unresolvedNl.push(...result.unresolvedNl);
  }

  // Count arrows
  const arrowCount = fieldEdges.length;

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
    warnings: index.warnings.map((w) => ({ text: w.text, file: w.file, row: w.row })),
    unresolved_nl: unresolvedNl,
  };
}

/**
 * Build schema-level edges from the directed graph.
 * Each edge has: from, to, role (source/target/metric_source).
 */
function buildSchemaEdges(index, schemaGraph, includedNodeIds, nsFilter) {
  const edges = [];

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
 * Build field-level edges from arrow records in the workspace index.
 */
function buildFieldEdges(index, includedNodeIds, nsFilter, includeNl) {
  const edges = [];
  const unresolvedNl = [];

  // Iterate all arrow records via the fieldArrows index
  // But fieldArrows duplicates records under multiple keys, so iterate raw arrow records instead.
  // We need to reconstruct from the index's mappings + arrow records.
  const seen = new Set();

  for (const [_key, records] of index.fieldArrows) {
    for (const record of records) {
      // Deduplicate — same arrow record may appear under multiple keys
      const dedupKey = `${record.file}:${record.line}:${record.target}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const mappingKey = record.namespace
        ? `${record.namespace}::${record.mapping}`
        : record.mapping;

      if (nsFilter) {
        const mapping = index.mappings.get(mappingKey);
        if (mapping?.namespace !== nsFilter) continue;
      }

      // Resolve source and target schema names
      const mapping = index.mappings.get(mappingKey);
      const sourceSchemas = mapping?.sources ?? [];
      const targetSchemas = mapping?.targets ?? [];

      const fromField = record.source
        ? (sourceSchemas.length > 0 ? `${sourceSchemas[0]}.${record.source}` : record.source)
        : null;
      const toField = record.target
        ? (targetSchemas.length > 0 ? `${targetSchemas[0]}.${record.target}` : record.target)
        : null;

      const edge = {
        from: fromField,
        to: toField,
        mapping: mappingKey,
        classification: record.classification,
        file: record.file,
        row: record.line,
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
            row: record.line,
          });
        }
      }
    }
  }

  return { edges, unresolvedNl };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function printDefault(graph) {
  console.log(`STM Graph — ${graph.workspace}`);
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
  const byClass = {};
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
    const adj = new Map();
    for (const e of graph.schema_edges) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from).push(`${e.to} [${e.role}]`);
    }
    for (const [src, targets] of adj) {
      console.log(`  ${src} -> ${targets.join(", ")}`);
    }
  }
}

function printCompact(graph) {
  for (const e of graph.schema_edges) {
    console.log(`${e.from} -> ${e.to}  [${e.role}]`);
  }
}
