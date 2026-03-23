/**
 * index-builder.ts — Build a WorkspaceIndex from parsed Satsuma files.
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
  extractImports,
  extractNotes,
} from "./extract.js";
import { extractNLRefData } from "./nl-ref-extract.js";
import type {
  ArrowRecord,
  DuplicateRecord,
  FieldDecl,
  FragmentRecord,
  MappingRecord,
  MetricRecord,
  NLRefData,
  NoteRecord,
  ParsedFile,
  QuestionRecord,
  ReferenceGraph,
  SchemaRecord,
  TransformRecord,
  WarningRecord,
  WorkspaceIndex,
} from "./types.js";

/**
 * Recursively merge `incoming` fields into `existing`, adding new fields and
 * merging children of fields that share the same name.
 */
function mergeFields(existing: FieldDecl[], incoming: FieldDecl[]): void {
  const byName = new Map<string, FieldDecl>();
  for (const f of existing) byName.set(f.name, f);
  for (const f of incoming) {
    const prev = byName.get(f.name);
    if (!prev) {
      existing.push(f);
      byName.set(f.name, f);
    } else if (f.children?.length) {
      // Recursively merge children when both sides are records
      if (!prev.children) prev.children = [];
      mergeFields(prev.children, f.children);
    }
  }
}

interface FileData {
  filePath: string;
  errorCount: number;
  schemas: ReturnType<typeof extractSchemas>;
  metrics: ReturnType<typeof extractMetrics>;
  mappings: ReturnType<typeof extractMappings>;
  fragments: ReturnType<typeof extractFragments>;
  transforms: ReturnType<typeof extractTransforms>;
  warnings: ReturnType<typeof extractWarnings>;
  questions: ReturnType<typeof extractQuestions>;
  arrowRecords: ReturnType<typeof extractArrowRecords>;
  namespaces: ReturnType<typeof extractNamespaces>;
  imports: ReturnType<typeof extractImports>;
  nlRefData: ReturnType<typeof extractNLRefData>;
  notes: ReturnType<typeof extractNotes>;
}

/**
 * Extract all structured data from a single parsed file's CST.
 *
 * This must be called while the tree-sitter tree is still valid (before
 * the parser is reused for another file). The returned data is plain JS
 * objects that remain valid after the tree is released.
 */
export function extractFileData({ filePath, tree, errorCount }: ParsedFile): FileData {
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
    imports: extractImports(root),
    nlRefData: extractNLRefData(root),
    notes: extractNotes(root),
  };
}

/**
 * Compute the qualified index key for a namespaced entity.
 * Global entities (namespace=null) use their bare name.
 * Namespaced entities use "ns::name".
 */
export function qualifiedKey(namespace: string | null | undefined, name: string | null): string {
  return namespace ? `${namespace}::${name}` : (name ?? "");
}

export function resolveScopedEntityRef(ref: string, currentNs: string | null, entityMap: Map<string, unknown>): string | null {
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

export function buildIndex(parsedFiles: (ParsedFile | FileData)[]): WorkspaceIndex {
  const schemas = new Map<string, SchemaRecord>();
  const duplicates: DuplicateRecord[] = [];
  const metrics = new Map<string, MetricRecord>();
  const mappings = new Map<string, MappingRecord>();
  const fragments = new Map<string, FragmentRecord>();
  const transforms = new Map<string, TransformRecord>();
  const warnings: WarningRecord[] = [];
  const questions: QuestionRecord[] = [];
  const allArrowRecords: ArrowRecord[] = [];
  const allNLRefData: NLRefData[] = [];
  const allNotes: NoteRecord[] = [];
  let totalErrors = 0;

  // Track all named definitions per namespace for cross-kind duplicate detection.
  const namesByNamespace = new Map<string, Map<string, { kind: string; file: string; row: number }>>();

  function checkDuplicate(kind: string, name: string | null, namespace: string | null | undefined, file: string, row: number): void {
    if (!name) return;
    const nsKey = namespace ?? "__global__";
    if (!namesByNamespace.has(nsKey)) namesByNamespace.set(nsKey, new Map());
    const nsNames = namesByNamespace.get(nsKey)!;
    if (nsNames.has(name)) {
      const prev = nsNames.get(name)!;
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
  const namespaceMeta = new Map<string, Map<string, { value: string; file: string; row: number }>>();

  // Accept either pre-extracted data or raw parsedFile objects.
  const fileDataList = parsedFiles.map((pf) =>
    "schemas" in pf ? pf : extractFileData(pf),
  );

  for (const fileData of fileDataList) {
    const { filePath } = fileData;
    totalErrors += fileData.errorCount;

    // Process namespace block metadata
    if (fileData.namespaces) {
      for (const ns of fileData.namespaces) {
        if (!ns.name) continue;
        if (!namespaceMeta.has(ns.name)) namespaceMeta.set(ns.name, new Map());
        const tags = namespaceMeta.get(ns.name)!;
        if (ns.note != null) {
          if (tags.has("note")) {
            const prev = tags.get("note")!;
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
      const existing = schemas.get(key);
      if (existing) {
        mergeFields(existing.fields, s.fields);
        existing.hasSpreads = existing.hasSpreads || s.hasSpreads;
        if (s.spreads?.length) {
          const existingSpreads = new Set(existing.spreads ?? []);
          for (const sp of s.spreads) {
            if (!existingSpreads.has(sp)) {
              (existing.spreads ??= []).push(sp);
            }
          }
        }
      } else {
        schemas.set(key, { ...s, file: filePath } as SchemaRecord);
      }
    }
    for (const m of fileData.metrics) {
      const key = qualifiedKey(m.namespace, m.name);
      checkDuplicate("metric", m.name, m.namespace, filePath, m.row);
      metrics.set(key, { ...m, file: filePath } as MetricRecord);
    }
    for (const m of fileData.mappings) {
      const qKey = m.name ? qualifiedKey(m.namespace, m.name) : `<anon>@${filePath}:${m.row}`;
      if (m.name) {
        checkDuplicate("mapping", m.name, m.namespace, filePath, m.row);
      }
      mappings.set(qKey, { ...m, file: filePath } as MappingRecord);
    }
    for (const f of fileData.fragments) {
      const key = qualifiedKey(f.namespace, f.name);
      checkDuplicate("fragment", f.name, f.namespace, filePath, f.row);
      fragments.set(key, { ...f, file: filePath } as FragmentRecord);
    }
    for (const t of fileData.transforms) {
      const key = qualifiedKey(t.namespace, t.name);
      checkDuplicate("transform", t.name, t.namespace, filePath, t.row);
      transforms.set(key, { ...t, file: filePath } as TransformRecord);
    }
    for (const w of fileData.warnings) {
      warnings.push({ ...w, file: filePath });
    }
    for (const q of fileData.questions) {
      questions.push({ ...q, file: filePath });
    }
    for (const ar of fileData.arrowRecords) {
      allArrowRecords.push({ ...ar, file: filePath } as ArrowRecord);
    }
    if (fileData.nlRefData) {
      for (const nr of fileData.nlRefData) {
        // Fill in file path for anonymous mapping placeholders
        const mapping = nr.mapping?.startsWith("<anon>@:")
          ? nr.mapping.replace("<anon>@:", `<anon>@${filePath}:`)
          : nr.mapping;
        allNLRefData.push({ ...nr, mapping, file: filePath } as NLRefData);
      }
    }
    if (fileData.notes) {
      for (const n of fileData.notes) {
        allNotes.push({ ...n, file: filePath });
      }
    }
  }

  // Build a set of known namespace names for reference resolution.
  const namespaceNames = new Set<string>();
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

  const referenceGraph = buildReferenceGraph({ schemas, metrics, mappings });
  const fieldArrows = buildFieldArrows(allArrowRecords, mappings);

  return {
    schemas,
    duplicates,
    metrics,
    mappings,
    fragments,
    transforms,
    notes: allNotes,
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
 */
export function resolveIndexKey<T>(name: string, entityMap: Map<string, T>): { key: string; entry: T } | null {
  if (entityMap.has(name)) {
    return { key: name, entry: entityMap.get(name)! };
  }
  if (name.includes("::")) return null;
  for (const [key, entry] of entityMap) {
    if (key.endsWith(`::${name}`)) {
      const matches = [...entityMap.keys()].filter((k) => k.endsWith(`::${name}`));
      if (matches.length === 1) {
        return { key, entry };
      }
      return null;
    }
  }
  return null;
}

/**
 * Build a field-level arrow index from arrow records.
 */
function buildFieldArrows(arrowRecords: ArrowRecord[], mappings: Map<string, MappingRecord>): Map<string, ArrowRecord[]> {
  const index = new Map<string, ArrowRecord[]>();

  function addToIndex(key: string | null, record: ArrowRecord): void {
    if (!key) return;
    if (!index.has(key)) index.set(key, []);
    index.get(key)!.push(record);
  }

  for (const record of arrowRecords) {
    const mappingKey = qualifiedKey(record.namespace, record.mapping);
    const mapping = mappings.get(mappingKey);
    const sourceSchemas = mapping?.sources ?? [];
    const targetSchemas = mapping?.targets ?? [];

    if (record.source) {
      const bareSource = record.source.replace(/^\./, "");
      for (const schema of sourceSchemas) {
        // Don't double-prefix if source already starts with schema name
        if (!bareSource.startsWith(schema + ".") && bareSource !== schema) {
          addToIndex(`${schema}.${bareSource}`, record);
        }
      }
      addToIndex(record.source, record);
      if (bareSource !== record.source) addToIndex(bareSource, record);
      // Index leaf field name for nested paths (e.g., PHONES[].PHONE_TYPE → PHONE_TYPE)
      const srcLastDot = bareSource.lastIndexOf(".");
      if (srcLastDot > 0) {
        addToIndex(bareSource.slice(srcLastDot + 1), record);
      }
    }
    if (record.target) {
      const bareTarget = record.target.replace(/^\./, "");
      for (const schema of targetSchemas) {
        // Don't double-prefix if target already starts with schema name
        if (!bareTarget.startsWith(schema + ".") && bareTarget !== schema) {
          addToIndex(`${schema}.${bareTarget}`, record);
        }
      }
      addToIndex(record.target, record);
      if (bareTarget !== record.target) addToIndex(bareTarget, record);
      // Index leaf field name for nested paths
      const tgtLastDot = bareTarget.lastIndexOf(".");
      if (tgtLastDot > 0) {
        addToIndex(bareTarget.slice(tgtLastDot + 1), record);
      }
    }
  }

  return index;
}

/**
 * Build a reference graph from the extracted items.
 */
function buildReferenceGraph({ schemas, metrics, mappings }: {
  schemas: Map<string, SchemaRecord>;
  metrics: Map<string, MetricRecord>;
  mappings: Map<string, MappingRecord>;
}): ReferenceGraph {
  const usedByMappings = new Map<string, string[]>();

  for (const [mappingName, mapping] of mappings) {
    const refs = [...mapping.sources, ...mapping.targets];
    for (const ref of refs) {
      if (!usedByMappings.has(ref)) usedByMappings.set(ref, []);
      usedByMappings.get(ref)!.push(mappingName);
    }
  }

  const fragmentsUsedIn = new Map<string, string[]>();
  for (const [schemaKey, schema] of schemas) {
    for (const spreadName of schema.spreads ?? []) {
      if (!fragmentsUsedIn.has(spreadName)) fragmentsUsedIn.set(spreadName, []);
      fragmentsUsedIn.get(spreadName)!.push(schemaKey);
    }
  }

  const metricsReferences = new Map<string, string[]>();
  for (const [metricName, metric] of metrics) {
    if (metric.sources.length > 0) {
      metricsReferences.set(metricName, [...metric.sources]);
    }
  }

  return { usedByMappings, fragmentsUsedIn, metricsReferences };
}
