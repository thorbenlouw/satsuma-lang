/**
 * diff.js — Structural comparison of two WorkspaceIndex instances
 *
 * Compares schemas (fields, types, metadata) and mappings (arrows, transforms).
 */

/**
 * @typedef {Object} Delta
 * @property {object} schemas  {added: string[], removed: string[], changed: Array<{name, changes}>}
 * @property {object} mappings {added: string[], removed: string[], changed: Array<{name, changes}>}
 */

/**
 * Compute a structural delta between two WorkspaceIndex instances.
 *
 * @param {object} indexA
 * @param {object} indexB
 * @returns {Delta}
 */
export function diffIndex(indexA, indexB) {
  return {
    schemas: diffBlockMap(indexA.schemas, indexB.schemas, diffSchema),
    mappings: diffBlockMap(indexA.mappings, indexB.mappings, diffMapping),
  };
}

function diffBlockMap(mapA, mapB, diffFn) {
  const added = [];
  const removed = [];
  const changed = [];

  for (const name of mapA.keys()) {
    if (!mapB.has(name)) {
      removed.push(name);
    } else {
      const changes = diffFn(mapA.get(name), mapB.get(name));
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

function diffSchema(a, b) {
  const changes = [];
  const aFields = new Map(a.fields.map((f) => [f.name, f]));
  const bFields = new Map(b.fields.map((f) => [f.name, f]));

  for (const [name, field] of aFields) {
    if (!bFields.has(name)) {
      changes.push({ kind: "field-removed", field: name });
    } else if (field.type !== bFields.get(name).type) {
      changes.push({
        kind: "type-changed",
        field: name,
        from: field.type,
        to: bFields.get(name).type,
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

function diffMapping(a, b) {
  const changes = [];

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
