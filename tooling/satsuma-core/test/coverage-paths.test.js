/**
 * coverage-paths.test.js — Shared path-set helpers for nested field coverage.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCoveredFieldSet, isCoveredFieldPath } from "@satsuma/core";

describe("buildCoveredFieldSet()", () => {
  it("marks nested field paths and their parents as covered", () => {
    const covered = buildCoveredFieldSet(["customer.email"]);
    assert.equal(isCoveredFieldPath("customer", covered), true);
    assert.equal(isCoveredFieldPath("customer.email", covered), true);
  });

  it("normalizes array traversal paths via addPathAndPrefixes", () => {
    const covered = buildCoveredFieldSet(["line_items[].sku"]);
    assert.equal(isCoveredFieldPath("line_items", covered), true);
    assert.equal(isCoveredFieldPath("line_items.sku", covered), true);
  });

  it("returns false for unrelated paths", () => {
    const covered = buildCoveredFieldSet(["customer.email"]);
    assert.equal(isCoveredFieldPath("customer.tier", covered), false);
  });
});
