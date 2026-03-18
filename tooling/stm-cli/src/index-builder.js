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
  extractArrowRecords,
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
 * @property {Map<string, object[]>} fieldArrows   "schema.field" → ArrowRecord[]
 * @property {object}              referenceGraph
 * @property {number}              totalErrors
 */
/**
 * Extract all structured data from a single parsed file's CST.
 *
 * This must be called while the tree-sitter tree is still valid (before
 * the parser is reused for another file). The returned data is plain JS
 * objects that remain valid after the tree is released.
 *
 * @param {{filePath:string, tree:object, errorCount:number}} parsedFile
 * @returns {object} extracted data for one file
 */
export function extractFileData({ filePath, tree, errorCount }) {
  const root = tree.rootNode;
  return {
    filePath,
    errorCount,
    schemas: extractSchemas(root),
    metrics: extractMetrics(root),
    mappings: extractMappings(root),
    fragments: extractFragments(root),
    transforms: extractTransforms(root),
    warnings: extractWarnings(root),
    questions: extractQuestions(root),
    arrowRecords: extractArrowRecords(root),
  };
}

export function buildIndex(parsedFiles) {
  const schemas = new Map();
  const metrics = new Map();
  const mappings = new Map();
  const fragments = new Map();
  const transforms = new Map();
  const warnings = [];
  const questions = [];
  const allArrowRecords = [];
  let totalErrors = 0;

  // Accept either pre-extracted data or raw parsedFile objects.
  // When receiving raw parsedFile objects (with .tree), extract immediately.
  const fileDataList = parsedFiles.map((pf) =>
    pf.schemas ? pf : extractFileData(pf),
  );

  for (const fileData of fileDataList) {
    const { filePath } = fileData;
    totalErrors += fileData.errorCount;

    for (const s of fileData.schemas) {
      schemas.set(s.name, { ...s, file: filePath });
    }
    for (const m of fileData.metrics) {
      metrics.set(m.name, { ...m, file: filePath });
    }
    for (const m of fileData.mappings) {
      const key = m.name ?? `<anon>@${filePath}:${m.row}`;
      mappings.set(key, { ...m, file: filePath });
    }
    for (const f of fileData.fragments) {
      fragments.set(f.name, { ...f, file: filePath });
    }
    for (const t of fileData.transforms) {
      transforms.set(t.name, { ...t, file: filePath });
    }
    for (const w of fileData.warnings) {
      warnings.push({ ...w, file: filePath });
    }
    for (const q of fileData.questions) {
      questions.push({ ...q, file: filePath });
    }
    for (const ar of fileData.arrowRecords) {
      allArrowRecords.push({ ...ar, file: filePath });
    }
  }

  const referenceGraph = buildReferenceGraph({ metrics, mappings });
  const fieldArrows = buildFieldArrows(allArrowRecords);

  return {
    schemas,
    metrics,
    mappings,
    fragments,
    transforms,
    warnings,
    questions,
    fieldArrows,
    referenceGraph,
    totalErrors,
  };
}

/**
 * Build a field-level arrow index from arrow records.
 *
 * Maps "schema.field" keys to the arrow records that involve that field
 * (as either source or target). The schema name is resolved from the
 * mapping's source/target declarations.
 *
 * @param {Array<object>} arrowRecords
 * @returns {Map<string, object[]>}
 */
function buildFieldArrows(arrowRecords) {
  const index = new Map();

  function addToIndex(key, record) {
    if (!key) return;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(record);
  }

  for (const record of arrowRecords) {
    if (record.source) addToIndex(record.source, record);
    if (record.target) addToIndex(record.target, record);
  }

  return index;
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
