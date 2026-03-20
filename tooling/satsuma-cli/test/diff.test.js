/**
 * diff.test.js — Unit tests for src/diff.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffIndex } from "../src/diff.js";

function makeIndex(schemas = {}, mappings = {}) {
  return {
    schemas: new Map(Object.entries(schemas)),
    mappings: new Map(Object.entries(mappings)),
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

  it("detects arrow count changes in mappings", () => {
    const a = makeIndex({}, { m1: { sources: ["a"], targets: ["b"], arrowCount: 5 } });
    const b = makeIndex({}, { m1: { sources: ["a"], targets: ["b"], arrowCount: 8 } });
    const delta = diffIndex(a, b);
    assert.equal(delta.mappings.changed.length, 1);
    assert.equal(delta.mappings.changed[0].changes[0].kind, "arrow-count-changed");
  });
});
