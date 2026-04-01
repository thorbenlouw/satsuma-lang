/**
 * diff.ts — Structural comparison of two WorkspaceIndex instances
 *
 * Compares schemas (fields, types, metadata, notes), mappings (arrows,
 * transforms, notes), metrics (sources, grain, slices, notes), fragments,
 * transforms, and standalone note blocks.
 *
 * The module is consumed by the `satsuma diff` command and any downstream
 * tooling that needs programmatic delta information between two workspaces.
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
 *
 * Compares every block type (schemas, mappings, metrics, fragments, transforms)
 * plus standalone note blocks. Block-owned note blocks (those with a non-null
 * parent) are compared within their parent block's diff, not at the top level.
 */
export function diffIndex(indexA: WorkspaceIndex, indexB: WorkspaceIndex): Delta {
  // Collect arrows per mapping for detailed comparison
  const arrowsA = collectArrowsByMapping(indexA);
  const arrowsB = collectArrowsByMapping(indexB);

  return {
    schemas: diffBlockMap(indexA.schemas, indexB.schemas, (a, b, key) => {
      const notesA = noteTextsForParent(indexA, key);
      const notesB = noteTextsForParent(indexB, key);
      return diffSchema(a, b, notesA, notesB);
    }),
    mappings: diffBlockMap(indexA.mappings, indexB.mappings, (a, b, key) => {
      const notesA = noteTextsForParent(indexA, key);
      const notesB = noteTextsForParent(indexB, key);
      return diffMapping(a, b, arrowsA.get(key) ?? [], arrowsB.get(key) ?? [], notesA, notesB);
    }),
    metrics: diffBlockMap(indexA.metrics, indexB.metrics, (a, b, key) => {
      const notesA = noteTextsForParent(indexA, key);
      const notesB = noteTextsForParent(indexB, key);
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Safe: key initialized on previous line
      byMapping.get(key)!.push(r);
    }
  }

  return byMapping;
}

/**
 * Generic structural diff for a Map of named blocks.
 *
 * The diffFn callback receives the key alongside both values, so callers
 * can look up associated data (e.g. notes) without a reverse-map scan.
 * (Fixes O(n^2) reverse lookup — sl-g4eo.)
 */
function diffBlockMap<T, C>(
  mapA: Map<string, T>,
  mapB: Map<string, T>,
  diffFn: (a: T, b: T, key: string) => C[],
): BlockDelta<C> {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: Array<{ name: string; changes: C[] }> = [];

  for (const name of mapA.keys()) {
    if (!mapB.has(name)) {
      removed.push(name);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Safe: .has() check on line above guarantees both entries exist
      const changes = diffFn(mapA.get(name)!, mapB.get(name)!, name);
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

// ── Schema diff ────────────────────────────────────────────────────────────

function diffSchema(a: SchemaRecord, b: SchemaRecord, notesA: Set<string>, notesB: Set<string>): SchemaChange[] {
  const changes: SchemaChange[] = [];

  // Compare schema-level note text (note "..." in metadata block)
  if ((a.note ?? "") !== (b.note ?? "")) {
    changes.push({ kind: "note-changed", field: "(note)", from: a.note || "(none)", to: b.note || "(none)" });
  }

  // Compare fields
  changes.push(...diffFieldList(a.fields, b.fields));

  // Compare note blocks inside the schema body (sl-fkwb)
  changes.push(...diffNoteSet(notesA, notesB));

  return changes;
}

// ── Metric diff ────────────────────────────────────────────────────────────

function diffMetric(a: MetricRecord, b: MetricRecord, notesA: Set<string>, notesB: Set<string>): SchemaChange[] {
  const changes: SchemaChange[] = [];

  // Compare metric header attributes (sl-1meq)
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
  changes.push(...diffNoteSet(notesA, notesB));

  return changes;
}

// ── Fragment diff ──────────────────────────────────────────────────────────

function diffFragment(a: FragmentRecord, b: FragmentRecord): SchemaChange[] {
  return diffFieldList(a.fields, b.fields);
}

// ── Transform diff ─────────────────────────────────────────────────────────

function diffTransform(a: TransformRecord, b: TransformRecord): TransformChange[] {
  const changes: TransformChange[] = [];
  if ((a.body ?? "") !== (b.body ?? "")) {
    changes.push({ kind: "body-changed", from: a.body || "(empty)", to: b.body || "(empty)" });
  }
  return changes;
}

// ── Field list diff ────────────────────────────────────────────────────────

function diffFieldList(aFields: FieldDecl[], bFields: FieldDecl[], prefix = ""): SchemaChange[] {
  const changes: SchemaChange[] = [];
  const aMap = new Map<string, FieldDecl>(aFields.map((f) => [f.name, f]));
  const bMap = new Map<string, FieldDecl>(bFields.map((f) => [f.name, f]));

  for (const [name, field] of aMap) {
    const qualName = prefix ? `${prefix}.${name}` : name;
    if (!bMap.has(name)) {
      changes.push({ kind: "field-removed", field: qualName });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Safe: .has() check above guarantees entry exists
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

// ── Mapping diff ───────────────────────────────────────────────────────────

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

  // Compare individual arrows by source->target key (sl-edrw: includes transform body)
  const arrowKey = (r: ArrowRecord) => `${r.sources.join(",") || ""}→${r.target ?? ""}`;
  const aByKey = new Map<string, ArrowRecord>();
  const bByKey = new Map<string, ArrowRecord>();
  for (const r of arrowsA) aByKey.set(arrowKey(r), r);
  for (const r of arrowsB) bByKey.set(arrowKey(r), r);

  for (const [key, ar] of aByKey) {
    if (!bByKey.has(key)) {
      changes.push({ kind: "arrow-removed", arrow: key });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Safe: .has() check above guarantees entry exists
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

  // Compare notes inside the mapping (sl-van1)
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

// ── Note diff helpers ──────────────────────────────────────────────────────

/** Maximum preview length for note text in change descriptions. */
const NOTE_PREVIEW_MAX_LENGTH = 60;

/**
 * Compare two sets of note texts and emit note-added / note-removed changes.
 * Used by schema, metric, and mapping block diffs to detect note block changes
 * within a parent block.
 */
function diffNoteSet(notesA: Set<string>, notesB: Set<string>): SchemaChange[] {
  const changes: SchemaChange[] = [];

  for (const text of notesB) {
    if (!notesA.has(text)) {
      const preview = text.length > NOTE_PREVIEW_MAX_LENGTH
        ? text.slice(0, NOTE_PREVIEW_MAX_LENGTH) + "..."
        : text;
      changes.push({ kind: "note-added", field: "(note)", from: preview });
    }
  }
  for (const text of notesA) {
    if (!notesB.has(text)) {
      const preview = text.length > NOTE_PREVIEW_MAX_LENGTH
        ? text.slice(0, NOTE_PREVIEW_MAX_LENGTH) + "..."
        : text;
      changes.push({ kind: "note-removed", field: "(note)", from: preview });
    }
  }

  return changes;
}

/**
 * Compare standalone (top-level) notes between two indexes.
 * Block-owned notes (parent !== null) are compared by their owning block's diff.
 */
function diffNotes(notesA: NoteRecord[], notesB: NoteRecord[]): NoteDelta {
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

// ── Metadata serialization ─────────────────────────────────────────────────

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
