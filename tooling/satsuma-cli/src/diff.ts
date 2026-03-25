/**
 * diff.ts — Structural comparison of two WorkspaceIndex instances
 *
 * Compares schemas (fields, types, metadata) and mappings (arrows, transforms).
 */

import type {
  ArrowRecord,
  BlockDelta,
  Delta,
  FieldDecl,
  FragmentRecord,
  MappingChange,
  MappingRecord,
  MetricRecord,
  NoteDelta,
  NoteRecord,
  SchemaChange,
  SchemaRecord,
  TransformChange,
  TransformRecord,
  WorkspaceIndex,
} from "./types.js";

/** Collect note texts for a given parent name from an index's notes. */
function noteTextsForParent(index: WorkspaceIndex, parentName: string): Set<string> {
  const texts = new Set<string>();
  for (const note of index.notes ?? []) {
    if (note.parent === parentName) texts.add(note.text);
  }
  return texts;
}

/**
 * Compute a structural delta between two WorkspaceIndex instances.
 */
export function diffIndex(indexA: WorkspaceIndex, indexB: WorkspaceIndex): Delta {
  // Collect arrows per mapping for detailed comparison
  const arrowsA = collectArrowsByMapping(indexA);
  const arrowsB = collectArrowsByMapping(indexB);

  return {
    schemas: diffBlockMap(indexA.schemas, indexB.schemas, diffSchema),
    mappings: diffBlockMap(indexA.mappings, indexB.mappings, (a, b) => {
      const mappingKey = [...indexA.mappings.entries()].find(([, v]) => v === a)?.[0] ?? "";
      const notesA = noteTextsForParent(indexA, mappingKey);
      const notesB = noteTextsForParent(indexB, mappingKey);
      return diffMapping(a, b, arrowsA.get(mappingKey) ?? [], arrowsB.get(mappingKey) ?? [], notesA, notesB);
    }),
    metrics: diffBlockMap(indexA.metrics, indexB.metrics, (a, b) => {
      const metricKey = [...indexA.metrics.entries()].find(([, v]) => v === a)?.[0] ?? "";
      const notesA = noteTextsForParent(indexA, metricKey);
      const notesB = noteTextsForParent(indexB, metricKey);
      return diffMetric(a, b, notesA, notesB);
    }),
    fragments: diffBlockMap(indexA.fragments, indexB.fragments, diffFragment),
    transforms: diffBlockMap(indexA.transforms, indexB.transforms, diffTransform),
    notes: diffNotes(indexA.notes ?? [], indexB.notes ?? []),
  };
}

/**
 * Collect arrow records grouped by mapping key.
 */
function collectArrowsByMapping(index: WorkspaceIndex): Map<string, ArrowRecord[]> {
  const byMapping = new Map<string, ArrowRecord[]>();
  const seen = new Set<string>();

  for (const [, records] of index.fieldArrows) {
    for (const r of records) {
      const dedupKey = `${r.file}:${r.line}:${r.sources.join(",")}:${r.target}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      const key = r.namespace ? `${r.namespace}::${r.mapping}` : (r.mapping ?? "");
      if (!byMapping.has(key)) byMapping.set(key, []);
      byMapping.get(key)!.push(r);
    }
  }

  return byMapping;
}

function diffBlockMap<T, C>(
  mapA: Map<string, T>,
  mapB: Map<string, T>,
  diffFn: (a: T, b: T) => C[],
): BlockDelta<C> {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: Array<{ name: string; changes: C[] }> = [];

  for (const name of mapA.keys()) {
    if (!mapB.has(name)) {
      removed.push(name);
    } else {
      const changes = diffFn(mapA.get(name)!, mapB.get(name)!);
      if (changes.length > 0) {
        changed.push({ name, changes });
      }
    }
  }
  for (const name of mapB.keys()) {
    if (!mapA.has(name)) {
      added.push(name);
    }
  }

  return { added, removed, changed };
}

function diffSchema(a: SchemaRecord, b: SchemaRecord): SchemaChange[] {
  const changes: SchemaChange[] = [];

  // Compare schema-level note text
  if ((a.note ?? "") !== (b.note ?? "")) {
    changes.push({ kind: "note-changed", field: "(note)", from: a.note || "(none)", to: b.note || "(none)" });
  }

  // Compare fields
  changes.push(...diffFieldList(a.fields, b.fields));
  return changes;
}

function diffMetric(a: MetricRecord, b: MetricRecord, notesA: Set<string>, notesB: Set<string>): SchemaChange[] {
  const changes: SchemaChange[] = [];

  // Compare metric header attributes
  const aSources = JSON.stringify(a.sources);
  const bSources = JSON.stringify(b.sources);
  if (aSources !== bSources) {
    changes.push({ kind: "source-changed", field: "(source)", from: a.sources.join(", ") || "(none)", to: b.sources.join(", ") || "(none)" });
  }
  if ((a.grain ?? "") !== (b.grain ?? "")) {
    changes.push({ kind: "grain-changed", field: "(grain)", from: a.grain || "(none)", to: b.grain || "(none)" });
  }
  const aSlices = JSON.stringify(a.slices);
  const bSlices = JSON.stringify(b.slices);
  if (aSlices !== bSlices) {
    changes.push({ kind: "slices-changed", field: "(slices)", from: a.slices.join(", ") || "(none)", to: b.slices.join(", ") || "(none)" });
  }

  // Compare fields
  changes.push(...diffFieldList(a.fields, b.fields));

  // Compare notes inside the metric
  for (const text of notesB) {
    if (!notesA.has(text)) {
      const preview = text.length > 60 ? text.slice(0, 60) + "..." : text;
      changes.push({ kind: "note-added", field: "(note)", from: preview });
    }
  }
  for (const text of notesA) {
    if (!notesB.has(text)) {
      const preview = text.length > 60 ? text.slice(0, 60) + "..." : text;
      changes.push({ kind: "note-removed", field: "(note)", from: preview });
    }
  }

  return changes;
}

function diffFragment(a: FragmentRecord, b: FragmentRecord): SchemaChange[] {
  return diffFieldList(a.fields, b.fields);
}

function diffTransform(a: TransformRecord, b: TransformRecord): TransformChange[] {
  const changes: TransformChange[] = [];
  if ((a.body ?? "") !== (b.body ?? "")) {
    changes.push({ kind: "body-changed", from: a.body || "(empty)", to: b.body || "(empty)" });
  }
  return changes;
}

function diffFieldList(aFields: FieldDecl[], bFields: FieldDecl[], prefix = ""): SchemaChange[] {
  const changes: SchemaChange[] = [];
  const aMap = new Map<string, FieldDecl>(aFields.map((f) => [f.name, f]));
  const bMap = new Map<string, FieldDecl>(bFields.map((f) => [f.name, f]));

  for (const [name, field] of aMap) {
    const qualName = prefix ? `${prefix}.${name}` : name;
    if (!bMap.has(name)) {
      changes.push({ kind: "field-removed", field: qualName });
    } else {
      const bField = bMap.get(name)!;
      if (field.type !== bField.type) {
        changes.push({ kind: "type-changed", field: qualName, from: field.type, to: bField.type });
      }
      // Compare metadata
      const aMeta = serializeMetadata(field.metadata);
      const bMeta = serializeMetadata(bField.metadata);
      if (aMeta !== bMeta) {
        changes.push({ kind: "metadata-changed", field: qualName, from: aMeta || "(none)", to: bMeta || "(none)" });
      }
      // Recurse into nested children
      if (field.children || bField.children) {
        changes.push(...diffFieldList(field.children ?? [], bField.children ?? [], qualName));
      }
    }
  }
  for (const [name] of bMap) {
    if (!aMap.has(name)) {
      const qualName = prefix ? `${prefix}.${name}` : name;
      changes.push({ kind: "field-added", field: qualName });
    }
  }
  return changes;
}

function diffMapping(a: MappingRecord, b: MappingRecord, arrowsA: ArrowRecord[], arrowsB: ArrowRecord[], notesA: Set<string>, notesB: Set<string>): MappingChange[] {
  const changes: MappingChange[] = [];

  if (a.arrowCount !== b.arrowCount) {
    changes.push({
      kind: "arrow-count-changed",
      from: a.arrowCount,
      to: b.arrowCount,
    });
  }

  // Compare source/target lists
  const aSources = JSON.stringify(a.sources);
  const bSources = JSON.stringify(b.sources);
  if (aSources !== bSources) {
    changes.push({ kind: "sources-changed", from: a.sources, to: b.sources });
  }

  const aTargets = JSON.stringify(a.targets);
  const bTargets = JSON.stringify(b.targets);
  if (aTargets !== bTargets) {
    changes.push({ kind: "targets-changed", from: a.targets, to: b.targets });
  }

  // Compare individual arrows by source→target key
  const arrowKey = (r: ArrowRecord) => `${r.sources.join(",") || ""}→${r.target ?? ""}`;
  const aByKey = new Map<string, ArrowRecord>();
  const bByKey = new Map<string, ArrowRecord>();
  for (const r of arrowsA) aByKey.set(arrowKey(r), r);
  for (const r of arrowsB) bByKey.set(arrowKey(r), r);

  for (const [key, ar] of aByKey) {
    if (!bByKey.has(key)) {
      changes.push({ kind: "arrow-removed", arrow: key });
    } else {
      const br = bByKey.get(key)!;
      if (ar.transform_raw !== br.transform_raw) {
        changes.push({
          kind: "arrow-transform-changed",
          arrow: key,
          from: ar.transform_raw || "(none)",
          to: br.transform_raw || "(none)",
        });
      }
    }
  }
  for (const key of bByKey.keys()) {
    if (!aByKey.has(key)) {
      changes.push({ kind: "arrow-added", arrow: key });
    }
  }

  // Compare notes inside the mapping
  for (const text of notesB) {
    if (!notesA.has(text)) {
      const preview = text.length > 60 ? text.slice(0, 60) + "..." : text;
      changes.push({ kind: "note-added", from: preview });
    }
  }
  for (const text of notesA) {
    if (!notesB.has(text)) {
      const preview = text.length > 60 ? text.slice(0, 60) + "..." : text;
      changes.push({ kind: "note-removed", from: preview });
    }
  }

  return changes;
}

function diffNotes(notesA: NoteRecord[], notesB: NoteRecord[]): NoteDelta {
  // Only compare top-level notes (no parent); block-owned notes are compared by their block diff
  const textsA = new Set(notesA.filter((n) => n.parent === null).map((n) => n.text));
  const textsB = new Set(notesB.filter((n) => n.parent === null).map((n) => n.text));
  const added: string[] = [];
  const removed: string[] = [];

  for (const t of textsB) {
    if (!textsA.has(t)) added.push(t);
  }
  for (const t of textsA) {
    if (!textsB.has(t)) removed.push(t);
  }

  return { added, removed };
}

function serializeMetadata(metadata: FieldDecl["metadata"]): string {
  if (!metadata || metadata.length === 0) return "";
  return metadata.map((m) => {
    if (m.kind === "tag") return m.tag;
    if (m.kind === "kv") return `${m.key} ${m.value}`;
    if (m.kind === "enum") return `enum {${m.values.join(", ")}}`;
    if (m.kind === "note") return `note "${m.text}"`;
    if (m.kind === "slice") return `slice {${m.values.join(", ")}}`;
    return JSON.stringify(m);
  }).join(", ");
}
