/**
 * diff.test.js — Unit tests for src/diff.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffIndex } from "#src/diff.js";

function makeIndex(schemas = {}, mappings = {}, { metrics = {}, fragments = {}, transforms = {}, notes = [], fieldArrows = {} } = {}) {
  return {
    schemas: new Map(Object.entries(schemas)),
    mappings: new Map(Object.entries(mappings)),
    metrics: new Map(Object.entries(metrics)),
    fragments: new Map(Object.entries(fragments)),
    transforms: new Map(Object.entries(transforms)),
    notes,
    fieldArrows: new Map(Object.entries(fieldArrows)),
  };
}

describe("diffIndex", () => {
  it("identical indexes produce empty diff", () => {
    const idx = makeIndex(
      { foo: { fields: [{ name: "id", type: "INT" }] } },
      { m1: { sources: ["foo"], targets: ["bar"], arrowCount: 2 } },
    );
    const delta = diffIndex(idx, idx);
    assert.equal(delta.schemas.added.length, 0);
    assert.equal(delta.schemas.removed.length, 0);
    assert.equal(delta.schemas.changed.length, 0);
    assert.equal(delta.mappings.added.length, 0);
    assert.equal(delta.mappings.removed.length, 0);
    assert.equal(delta.mappings.changed.length, 0);
  });

  it("detects added and removed schemas", () => {
    const a = makeIndex({ foo: { fields: [] } });
    const b = makeIndex({ bar: { fields: [] } });
    const delta = diffIndex(a, b);
    assert.deepEqual(delta.schemas.removed, ["foo"]);
    assert.deepEqual(delta.schemas.added, ["bar"]);
  });

  it("detects added fields", () => {
    const a = makeIndex({ foo: { fields: [{ name: "id", type: "INT" }] } });
    const b = makeIndex({
      foo: {
        fields: [
          { name: "id", type: "INT" },
          { name: "name", type: "VARCHAR" },
        ],
      },
    });
    const delta = diffIndex(a, b);
    assert.equal(delta.schemas.changed.length, 1);
    assert.equal(delta.schemas.changed[0].changes[0].kind, "field-added");
    assert.equal(delta.schemas.changed[0].changes[0].field, "name");
  });

  it("detects removed fields", () => {
    const a = makeIndex({
      foo: {
        fields: [
          { name: "id", type: "INT" },
          { name: "name", type: "VARCHAR" },
        ],
      },
    });
    const b = makeIndex({ foo: { fields: [{ name: "id", type: "INT" }] } });
    const delta = diffIndex(a, b);
    assert.equal(delta.schemas.changed.length, 1);
    assert.equal(delta.schemas.changed[0].changes[0].kind, "field-removed");
  });

  it("detects type changes", () => {
    const a = makeIndex({ foo: { fields: [{ name: "id", type: "INT" }] } });
    const b = makeIndex({ foo: { fields: [{ name: "id", type: "BIGINT" }] } });
    const delta = diffIndex(a, b);
    assert.equal(delta.schemas.changed[0].changes[0].kind, "type-changed");
    assert.equal(delta.schemas.changed[0].changes[0].from, "INT");
    assert.equal(delta.schemas.changed[0].changes[0].to, "BIGINT");
  });

  it("detects metric source changes", () => {
    const a = makeIndex({}, {}, { metrics: { rev: { sources: ["fact_orders"], grain: "monthly", slices: ["region"], fields: [] } } });
    const b = makeIndex({}, {}, { metrics: { rev: { sources: ["fact_orders", "dim_date"], grain: "monthly", slices: ["region"], fields: [] } } });
    const delta = diffIndex(a, b);
    assert.equal(delta.metrics.changed.length, 1);
    assert.equal(delta.metrics.changed[0].changes[0].kind, "source-changed");
    assert.equal(delta.metrics.changed[0].changes[0].from, "fact_orders");
    assert.equal(delta.metrics.changed[0].changes[0].to, "fact_orders, dim_date");
  });

  it("detects metric grain changes", () => {
    const a = makeIndex({}, {}, { metrics: { rev: { sources: ["s"], grain: "monthly", slices: [], fields: [] } } });
    const b = makeIndex({}, {}, { metrics: { rev: { sources: ["s"], grain: "quarterly", slices: [], fields: [] } } });
    const delta = diffIndex(a, b);
    assert.equal(delta.metrics.changed.length, 1);
    assert.equal(delta.metrics.changed[0].changes[0].kind, "grain-changed");
  });

  it("detects metric slices changes", () => {
    const a = makeIndex({}, {}, { metrics: { rev: { sources: ["s"], grain: null, slices: ["region"], fields: [] } } });
    const b = makeIndex({}, {}, { metrics: { rev: { sources: ["s"], grain: null, slices: ["region", "channel"], fields: [] } } });
    const delta = diffIndex(a, b);
    assert.equal(delta.metrics.changed.length, 1);
    assert.equal(delta.metrics.changed[0].changes[0].kind, "slices-changed");
  });

  it("detects mapping note additions", () => {
    const a = makeIndex(
      {},
      { m1: { sources: ["a"], targets: ["b"], arrowCount: 1 } },
      { notes: [] },
    );
    const b = makeIndex(
      {},
      { m1: { sources: ["a"], targets: ["b"], arrowCount: 1 } },
      { notes: [{ text: "Added note.", parent: "m1", file: "x.stm", row: 5, namespace: null }] },
    );
    const delta = diffIndex(a, b);
    assert.equal(delta.mappings.changed.length, 1);
    const noteChanges = delta.mappings.changed[0].changes.filter((c) => c.kind === "note-added");
    assert.equal(noteChanges.length, 1);
  });

  it("mapping notes do not appear as top-level note changes", () => {
    const a = makeIndex({}, { m1: { sources: ["a"], targets: ["b"], arrowCount: 1 } }, { notes: [] });
    const b = makeIndex(
      {},
      { m1: { sources: ["a"], targets: ["b"], arrowCount: 1 } },
      { notes: [{ text: "Block note.", parent: "m1", file: "x.stm", row: 5, namespace: null }] },
    );
    const delta = diffIndex(a, b);
    assert.equal(delta.notes.added.length, 0, "block-owned notes should not appear in top-level notes");
  });

  it("detects arrow count changes in mappings", () => {
    const a = makeIndex({}, { m1: { sources: ["a"], targets: ["b"], arrowCount: 5 } });
    const b = makeIndex({}, { m1: { sources: ["a"], targets: ["b"], arrowCount: 8 } });
    const delta = diffIndex(a, b);
    assert.equal(delta.mappings.changed.length, 1);
    assert.equal(delta.mappings.changed[0].changes[0].kind, "arrow-count-changed");
  });
});
