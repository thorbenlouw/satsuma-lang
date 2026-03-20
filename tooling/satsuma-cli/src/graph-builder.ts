/**
 * graph-builder.ts — Build a directed schema-level graph from a WorkspaceIndex.
 *
 * Shared by `satsuma lineage` and `satsuma graph` commands.
 */

import { extractBacktickRefs, classifyRef } from "./nl-ref-extract.js";
import type { WorkspaceIndex } from "./types.js";

export interface GraphNode {
  type: string;
  file?: string;
}

export interface FullGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, Set<string>>;
}

/**
 * Build a directed graph: edges go from source to target (downstream).
 */
export function buildFullGraph(index: WorkspaceIndex): FullGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, Set<string>>();

  const addNode = (name: string, type: string, file?: string): void => {
    if (!nodes.has(name)) nodes.set(name, { type, file });
  };
  const addEdge = (src: string, tgt: string): void => {
    if (!edges.has(src)) edges.set(src, new Set());
    edges.get(src)!.add(tgt);
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

  // NL backtick references
  if (index.nlRefData) {
    for (const item of index.nlRefData) {
      const refs = extractBacktickRefs(item.text);
      const mappingKey = item.namespace
        ? `${item.namespace}::${item.mapping}`
        : item.mapping;

      for (const { ref } of refs) {
        const classification = classifyRef(ref);
        if (classification === "namespace-qualified-schema" && index.schemas.has(ref)) {
          addNode(ref, "schema");
          addEdge(ref, mappingKey);
        } else if (classification === "namespace-qualified-field") {
          const dotIdx = ref.indexOf(".", ref.indexOf("::") + 2);
          const schemaRef = ref.slice(0, dotIdx);
          if (index.schemas.has(schemaRef)) {
            addNode(schemaRef, "schema");
            addEdge(schemaRef, mappingKey);
          }
        } else if (classification === "bare" && item.namespace) {
          const nsRef = `${item.namespace}::${ref}`;
          if (index.schemas.has(nsRef)) {
            addNode(nsRef, "schema");
            addEdge(nsRef, mappingKey);
          } else if (index.schemas.has(ref)) {
            addNode(ref, "schema");
            addEdge(ref, mappingKey);
          }
        } else if (classification === "bare" && index.schemas.has(ref)) {
          addNode(ref, "schema");
          addEdge(ref, mappingKey);
        }
      }
    }
  }

  return { nodes, edges };
}
