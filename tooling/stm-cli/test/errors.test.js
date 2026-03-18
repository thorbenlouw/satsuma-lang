/**
 * errors.test.js — Unit tests for src/errors.js utilities.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findSuggestion } from "../src/errors.js";

describe("findSuggestion", () => {
  it("returns exact case-insensitive match", () => {
    assert.equal(findSuggestion("Orders", ["orders", "customers"]), "orders");
  });

  it("returns prefix match when no exact match", () => {
    const result = findSuggestion("cust", ["customers", "orders"]);
    assert.equal(result, "customers");
  });

  it("returns null when no match", () => {
    assert.equal(findSuggestion("xyz", ["orders", "customers"]), null);
  });

  it("prefers exact over prefix", () => {
    // "orders" exactly matches "ORDERS" case-insensitively
    const result = findSuggestion("ORDERS", ["orders", "order_items"]);
    assert.equal(result, "orders");
  });

  it("handles empty available list", () => {
    assert.equal(findSuggestion("anything", []), null);
  });
});
