/**
 * graph-builder.js — Build a directed schema-level graph from a WorkspaceIndex.
 *
 * Shared by `satsuma lineage` and `satsuma graph` commands.
 */

import { extractBacktickRefs, classifyRef } from "./nl-ref-extract.js";

/**
 * Build a directed graph: edges go from source to target (downstream).
 *
 * Nodes: schema names, metric names, mapping names, fragment names, transform names
 * Edges: schema → mapping (via sources), mapping → schema (via targets),
 *        schema → metric (via metricsReferences), NL backtick refs → mapping
 *
 * @param {import('./index-builder.js').WorkspaceIndex} index
 * @returns {{ nodes: Map<string, {type: string, file?: string}>, edges: Map<string, Set<string>> }}
 */
export function buildFullGraph(index) {
  /** @type {Map<string, {type: string, file?: string}>} */
  const nodes = new Map();
  /** @type {Map<string, Set<string>>} */
  const edges = new Map(); // src → Set<tgt>

  const addNode = (name, type, file) => {
    if (!nodes.has(name)) nodes.set(name, { type, file });
  };
  const addEdge = (src, tgt) => {
    if (!edges.has(src)) edges.set(src, new Set());
    edges.get(src).add(tgt);
  };

  // Add all known nodes
  for (const [name, s] of index.schemas) addNode(name, "schema", s.file);
  for (const [name, m] of index.metrics) addNode(name, "metric", m.file);
  for (const [name, m] of index.mappings) addNode(name, "mapping", m.file);
  for (const [name, f] of index.fragments) addNode(name, "fragment", f.file);
  for (const [name, t] of index.transforms) addNode(name, "transform", t.file);

  // schema → mapping (schema is a source of a mapping)
  for (const [mappingName, mapping] of index.mappings) {
    for (const src of mapping.sources) {
      addNode(src, "schema");
      addEdge(src, mappingName);
    }
    // mapping → target schema
    for (const tgt of mapping.targets) {
      addNode(tgt, "schema");
      addEdge(mappingName, tgt);
    }
  }

  // target schema → metric (metric consumes schemas)
  for (const [metricName, metric] of index.referenceGraph.metricsReferences) {
    for (const src of metric) {
      addNode(src, "schema");
      addEdge(src, metricName);
    }
  }

  // NL backtick references — add edges for schema refs found in NL transform bodies
  if (index.nlRefData) {
    for (const item of index.nlRefData) {
      const refs = extractBacktickRefs(item.text);
      const mappingKey = item.namespace
        ? `${item.namespace}::${item.mapping}`
        : item.mapping;

      for (const { ref } of refs) {
        const classification = classifyRef(ref);
        if (classification === "namespace-qualified-schema" && index.schemas.has(ref)) {
          // NL block references a schema — add edge from that schema to the mapping
          addNode(ref, "schema");
          addEdge(ref, mappingKey);
        } else if (classification === "namespace-qualified-field") {
          // ns::schema.field — add edge from the schema part
          const dotIdx = ref.indexOf(".", ref.indexOf("::") + 2);
          const schemaRef = ref.slice(0, dotIdx);
          if (index.schemas.has(schemaRef)) {
            addNode(schemaRef, "schema");
            addEdge(schemaRef, mappingKey);
          }
        }
      }
    }
  }

  return { nodes, edges };
}
