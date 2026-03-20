/**
 * diff.ts — Structural comparison of two WorkspaceIndex instances
 *
 * Compares schemas (fields, types, metadata) and mappings (arrows, transforms).
 */

import type {
  BlockDelta,
  Delta,
  FieldDecl,
  MappingChange,
  MappingRecord,
  SchemaChange,
  SchemaRecord,
  WorkspaceIndex,
} from "./types.js";

/**
 * Compute a structural delta between two WorkspaceIndex instances.
 */
export function diffIndex(indexA: WorkspaceIndex, indexB: WorkspaceIndex): Delta {
  return {
    schemas: diffBlockMap(indexA.schemas, indexB.schemas, diffSchema),
    mappings: diffBlockMap(indexA.mappings, indexB.mappings, diffMapping),
  };
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
  const aFields = new Map<string, FieldDecl>(a.fields.map((f) => [f.name, f]));
  const bFields = new Map<string, FieldDecl>(b.fields.map((f) => [f.name, f]));

  for (const [name, field] of aFields) {
    if (!bFields.has(name)) {
      changes.push({ kind: "field-removed", field: name });
    } else if (field.type !== bFields.get(name)!.type) {
      changes.push({
        kind: "type-changed",
        field: name,
        from: field.type,
        to: bFields.get(name)!.type,
      });
    }
  }
  for (const name of bFields.keys()) {
    if (!aFields.has(name)) {
      changes.push({ kind: "field-added", field: name });
    }
  }

  return changes;
}

function diffMapping(a: MappingRecord, b: MappingRecord): MappingChange[] {
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

  return changes;
}
