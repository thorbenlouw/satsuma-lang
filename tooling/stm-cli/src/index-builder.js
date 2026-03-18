/**
 * index-builder.js — Build a WorkspaceIndex from parsed STM files.
 *
 * Merges extraction results from all files in a workspace into a single
 * in-memory index with a cross-reference graph.
 */

import {
  extractSchemas,
  extractMetrics,
  extractMappings,
  extractFragments,
  extractTransforms,
  extractWarnings,
  extractQuestions,
} from "./extract.js";

/**
 * Build a WorkspaceIndex from an array of parsed file results.
 *
 * @param {Array<{filePath:string, src:string, tree:object, errorCount:number}>} parsedFiles
 * @returns {WorkspaceIndex}
 *
 * @typedef {Object} WorkspaceIndex
 * @property {Map<string, object>} schemas     name → {name, note, fields, file, row}
 * @property {Map<string, object>} metrics     name → {name, displayName, fields, file, row, ...}
 * @property {Map<string, object>} mappings    name → {name, sources, targets, file, row, ...}
 * @property {Map<string, object>} fragments   name → {name, fields, file, row}
 * @property {Map<string, object>} transforms  name → {name, file, row}
 * @property {Array<object>}       warnings    [{text, file, row}]
 * @property {Array<object>}       questions   [{text, file, row}]
 * @property {object}              referenceGraph
 * @property {number}              totalErrors
 */
export function buildIndex(parsedFiles) {
  const schemas = new Map();
  const metrics = new Map();
  const mappings = new Map();
  const fragments = new Map();
  const transforms = new Map();
  const warnings = [];
  const questions = [];
  let totalErrors = 0;

  for (const { filePath, tree, errorCount } of parsedFiles) {
    totalErrors += errorCount;
    const root = tree.rootNode;

    for (const s of extractSchemas(root)) {
      schemas.set(s.name, { ...s, file: filePath });
    }
    for (const m of extractMetrics(root)) {
      metrics.set(m.name, { ...m, file: filePath });
    }
    for (const m of extractMappings(root)) {
      const key = m.name ?? `<anon>@${filePath}:${m.row}`;
      mappings.set(key, { ...m, file: filePath });
    }
    for (const f of extractFragments(root)) {
      fragments.set(f.name, { ...f, file: filePath });
    }
    for (const t of extractTransforms(root)) {
      transforms.set(t.name, { ...t, file: filePath });
    }
    for (const w of extractWarnings(root)) {
      warnings.push({ ...w, file: filePath });
    }
    for (const q of extractQuestions(root)) {
      questions.push({ ...q, file: filePath });
    }
  }

  const referenceGraph = buildReferenceGraph({ metrics, mappings });

  return {
    schemas,
    metrics,
    mappings,
    fragments,
    transforms,
    warnings,
    questions,
    referenceGraph,
    totalErrors,
  };
}

/**
 * Build a reference graph from the extracted items.
 *
 * @returns {{
 *   usedByMappings: Map<string, string[]>,  // schema/fragment → mapping names
 *   fragmentsUsedIn: Map<string, string[]>, // fragment → schema/fragment names
 *   metricsReferences: Map<string, string[]> // metric → source schema names
 * }}
 */
function buildReferenceGraph({ metrics, mappings }) {
  // schema/fragment → which mappings reference it (as source or target)
  const usedByMappings = new Map();

  for (const [mappingName, mapping] of mappings) {
    const refs = [...mapping.sources, ...mapping.targets];
    for (const ref of refs) {
      if (!usedByMappings.has(ref)) usedByMappings.set(ref, []);
      usedByMappings.get(ref).push(mappingName);
    }
  }

  // fragment → which schemas/fragments use it via ...spread (tracked via fields named '...')
  // We don't have spread info in the current extraction, so we leave a placeholder.
  // (fragment_spread nodes are inside schema_body but not captured in extractDirectFields)
  const fragmentsUsedIn = new Map();

  // metric → source schema references
  const metricsReferences = new Map();
  for (const [metricName, metric] of metrics) {
    if (metric.sources.length > 0) {
      metricsReferences.set(metricName, [...metric.sources]);
    }
  }

  return { usedByMappings, fragmentsUsedIn, metricsReferences };
}
