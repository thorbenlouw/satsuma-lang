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
  extractNamespaces,
} from "./extract.js";
import { extractNLRefData } from "./nl-ref-extract.js";

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
    namespaces: extractNamespaces(root),
    nlRefData: extractNLRefData(root),
  };
}

/**
 * Compute the qualified index key for a namespaced entity.
 * Global entities (namespace=null) use their bare name.
 * Namespaced entities use "ns::name".
 */
export function qualifiedKey(namespace, name) {
  return namespace ? `${namespace}::${name}` : name;
}

export function resolveScopedEntityRef(ref, currentNs, entityMap) {
  if (ref.includes("::")) {
    return entityMap.has(ref) ? ref : null;
  }
  if (currentNs) {
    const nsKey = `${currentNs}::${ref}`;
    if (entityMap.has(nsKey)) return nsKey;
  }
  if (entityMap.has(ref)) return ref;
  return null;
}

export function buildIndex(parsedFiles) {
  const schemas = new Map();
  const duplicates = [];
  const metrics = new Map();
  const mappings = new Map();
  const fragments = new Map();
  const transforms = new Map();
  const warnings = [];
  const questions = [];
  const allArrowRecords = [];
  const allNLRefData = [];
  let totalErrors = 0;

  // Track all named definitions per namespace for cross-kind duplicate detection.
  // A schema and a metric with the same name in the same namespace is a conflict.
  // namespace key: null → "__global__", otherwise the namespace name.
  const namesByNamespace = new Map(); // nsKey → Map(name → {kind, file, row})

  function checkDuplicate(kind, name, namespace, file, row) {
    const nsKey = namespace ?? "__global__";
    if (!namesByNamespace.has(nsKey)) namesByNamespace.set(nsKey, new Map());
    const nsNames = namesByNamespace.get(nsKey);
    if (nsNames.has(name)) {
      const prev = nsNames.get(name);
      duplicates.push({
        kind,
        name: qualifiedKey(namespace, name),
        file,
        row,
        previousKind: prev.kind,
        previousFile: prev.file,
        previousRow: prev.row,
      });
    }
    nsNames.set(name, { kind, file, row });
  }

  // Track namespace block metadata for merge conflict detection.
  // nsName → Map(tagKey → {value, file, row})
  const namespaceMeta = new Map();

  // Accept either pre-extracted data or raw parsedFile objects.
  // When receiving raw parsedFile objects (with .tree), extract immediately.
  const fileDataList = parsedFiles.map((pf) =>
    pf.schemas ? pf : extractFileData(pf),
  );

  for (const fileData of fileDataList) {
    const { filePath } = fileData;
    totalErrors += fileData.errorCount;

    // Process namespace block metadata — detect conflicting values across blocks.
    if (fileData.namespaces) {
      for (const ns of fileData.namespaces) {
        if (!ns.name) continue;
        if (!namespaceMeta.has(ns.name)) namespaceMeta.set(ns.name, new Map());
        const tags = namespaceMeta.get(ns.name);
        if (ns.note != null) {
          if (tags.has("note")) {
            const prev = tags.get("note");
            if (prev.value !== ns.note) {
              duplicates.push({
                kind: "namespace-metadata",
                name: ns.name,
                file: filePath,
                row: ns.row,
                previousKind: "namespace-metadata",
                previousFile: prev.file,
                previousRow: prev.row,
                tag: "note",
                value: ns.note,
                previousValue: prev.value,
              });
            }
          } else {
            tags.set("note", { value: ns.note, file: filePath, row: ns.row });
          }
        }
      }
    }

    for (const s of fileData.schemas) {
      const key = qualifiedKey(s.namespace, s.name);
      checkDuplicate("schema", s.name, s.namespace, filePath, s.row);
      schemas.set(key, { ...s, file: filePath });
    }
    for (const m of fileData.metrics) {
      const key = qualifiedKey(m.namespace, m.name);
      checkDuplicate("metric", m.name, m.namespace, filePath, m.row);
      metrics.set(key, { ...m, file: filePath });
    }
    for (const m of fileData.mappings) {
      const qKey = m.name ? qualifiedKey(m.namespace, m.name) : `<anon>@${filePath}:${m.row}`;
      if (m.name) {
        checkDuplicate("mapping", m.name, m.namespace, filePath, m.row);
      }
      mappings.set(qKey, { ...m, file: filePath });
    }
    for (const f of fileData.fragments) {
      const key = qualifiedKey(f.namespace, f.name);
      checkDuplicate("fragment", f.name, f.namespace, filePath, f.row);
      fragments.set(key, { ...f, file: filePath });
    }
    for (const t of fileData.transforms) {
      const key = qualifiedKey(t.namespace, t.name);
      checkDuplicate("transform", t.name, t.namespace, filePath, t.row);
      transforms.set(key, { ...t, file: filePath });
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
    if (fileData.nlRefData) {
      for (const nr of fileData.nlRefData) {
        allNLRefData.push({ ...nr, file: filePath });
      }
    }
  }

  // Build a set of known namespace names for reference resolution.
  const namespaceNames = new Set();
  for (const key of namesByNamespace.keys()) {
    if (key !== "__global__") namespaceNames.add(key);
  }

  const allDefinitions = new Map([...schemas, ...fragments]);
  for (const mapping of mappings.values()) {
    const currentNs = mapping.namespace ?? null;
    mapping.sources = mapping.sources.map((ref) =>
      resolveScopedEntityRef(ref, currentNs, allDefinitions) ?? ref,
    );
    mapping.targets = mapping.targets.map((ref) =>
      resolveScopedEntityRef(ref, currentNs, allDefinitions) ?? ref,
    );
  }
  for (const metric of metrics.values()) {
    const currentNs = metric.namespace ?? null;
    metric.sources = metric.sources.map((ref) =>
      resolveScopedEntityRef(ref, currentNs, schemas) ?? ref,
    );
  }

  const referenceGraph = buildReferenceGraph({ metrics, mappings });
  const fieldArrows = buildFieldArrows(allArrowRecords, mappings);

  return {
    schemas,
    duplicates,
    metrics,
    mappings,
    fragments,
    transforms,
    warnings,
    questions,
    fieldArrows,
    referenceGraph,
    namespaceNames,
    nlRefData: allNLRefData,
    totalErrors,
  };
}

/**
 * Resolve a user-provided entity name against an index map.
 *
 * Resolution order:
 * 1. Exact match (handles both qualified "ns::name" and global "name")
 * 2. If unqualified and no exact match, search for any "ns::name" match
 *
 * @param {string} name  User-provided entity name
 * @param {Map} entityMap  The index map to search
 * @returns {{key: string, entry: object}|null}  Resolved key and entry, or null
 */
export function resolveIndexKey(name, entityMap) {
  // Exact match first
  if (entityMap.has(name)) {
    return { key: name, entry: entityMap.get(name) };
  }
  // If already qualified, no further search
  if (name.includes("::")) return null;
  // Search for ns::name matches
  for (const [key, entry] of entityMap) {
    if (key.endsWith(`::${name}`)) {
      // Check for ambiguity — if multiple namespaces have this name, require qualification
      const matches = [...entityMap.keys()].filter((k) => k.endsWith(`::${name}`));
      if (matches.length === 1) {
        return { key, entry };
      }
      // Ambiguous — return null (caller should suggest alternatives)
      return null;
    }
  }
  return null;
}

/**
 * Build a field-level arrow index from arrow records.
 *
 * Maps "schema.field" keys to the arrow records that involve that field
 * (as either source or target). The schema name is resolved from the
 * mapping's source/target declarations.
 *
 * @param {Array<object>} arrowRecords
 * @param {Map<string, object>} mappings  mapping index for schema resolution
 * @returns {Map<string, object[]>}
 */
function buildFieldArrows(arrowRecords, mappings) {
  const index = new Map();

  function addToIndex(key, record) {
    if (!key) return;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(record);
  }

  for (const record of arrowRecords) {
    const mappingKey = qualifiedKey(record.namespace, record.mapping);
    const mapping = mappings.get(mappingKey);
    const sourceSchemas = mapping?.sources ?? [];
    const targetSchemas = mapping?.targets ?? [];

    if (record.source) {
      // Index under each source schema — most mappings have exactly one
      for (const schema of sourceSchemas) {
        addToIndex(`${schema}.${record.source}`, record);
      }
      // Also index by bare field name for backwards compatibility
      addToIndex(record.source, record);
    }
    if (record.target) {
      for (const schema of targetSchemas) {
        addToIndex(`${schema}.${record.target}`, record);
      }
      addToIndex(record.target, record);
    }
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
