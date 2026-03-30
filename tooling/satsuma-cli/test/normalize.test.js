/**
 * normalize.test.js — Unit tests for src/normalize.js
 *
 * Tests the CLI-level field-matching logic (matchFields).
 * normalizeName is tested in satsuma-core/test/string-utils.test.js — its
 * behaviour is not re-tested here to avoid duplication.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchFields } from "#src/normalize.js";

describe("matchFields", () => {
  it("matches fields by normalized name", () => {
    // Verifies the full matching pipeline: normalization + lookup + result shape.
    const src = [{ name: "FirstName", type: "VARCHAR" }];
    const tgt = [{ name: "first_name", type: "VARCHAR" }];
    const result = matchFields(src, tgt);
    assert.equal(result.matched.length, 1);
    assert.equal(result.matched[0].source, "FirstName");
    assert.equal(result.matched[0].target, "first_name");
    assert.equal(result.matched[0].normalized, "firstname");
  });

  it("returns source-only and target-only correctly", () => {
    // Ensures unmatched fields on each side are correctly categorised.
    const src = [
      { name: "id", type: "INT" },
      { name: "email", type: "VARCHAR" },
    ];
    const tgt = [
      { name: "email", type: "VARCHAR" },
      { name: "phone", type: "VARCHAR" },
    ];
    const result = matchFields(src, tgt);
    assert.equal(result.matched.length, 1);
    assert.deepEqual(result.sourceOnly, ["id"]);
    assert.deepEqual(result.targetOnly, ["phone"]);
  });

  it("handles empty fields", () => {
    const result = matchFields([], []);
    assert.equal(result.matched.length, 0);
    assert.equal(result.sourceOnly.length, 0);
    assert.equal(result.targetOnly.length, 0);
  });
});
