/**
 * coverage.test.js — Unit tests for the coverage path utility.
 *
 * Tests addPathAndPrefixes(), the canonical path-normalisation function used
 * by both the CLI (--unmapped-by) and the VS Code gutter decorations to build
 * the set of covered field paths from a mapping's arrows.
 *
 * Higher-level computeMappingCoverage tests remain in
 * vscode-satsuma/server/test/coverage.test.js because they depend on the LSP's
 * WorkspaceIndex and FieldInfo types.  Only the shared path utility is tested
 * here to avoid duplication.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addPathAndPrefixes } from "@satsuma/core";

describe("addPathAndPrefixes", () => {
  it("adds a flat field name to the set", () => {
    // Simple case: "id" → {id}. Verifies the function handles leaf-only paths.
    const set = new Set();
    addPathAndPrefixes(set, "id");
    assert.ok(set.has("id"));
  });

  it("adds all ancestor prefixes for a dotted path", () => {
    // addPathAndPrefixes must register all ancestors — coverage checks fire on
    // "address" even when the arrow targets "address.city". Without prefix
    // registration, the parent field would always appear unmapped.
    const set = new Set();
    addPathAndPrefixes(set, "address.city");
    assert.ok(set.has("address"), "parent prefix 'address' must be registered");
    assert.ok(set.has("address.city"), "full path must be registered");
    assert.ok(set.has("city"), "bare leaf 'city' must be registered for cross-level matching");
  });

  it("registers all intermediate prefixes for a three-level path", () => {
    // Ensures prefix expansion is recursive, not just one level deep.
    const set = new Set();
    addPathAndPrefixes(set, "a.b.c");
    assert.ok(set.has("a"));
    assert.ok(set.has("a.b"));
    assert.ok(set.has("a.b.c"));
    assert.ok(set.has("b"));
    assert.ok(set.has("c"));
  });

  it("strips [] array notation before splitting", () => {
    // List-traversal paths like "items[].id" must be normalised to "items.id"
    // so that the field "items" (declared without brackets in the schema) is
    // correctly matched as covered.
    const set = new Set();
    addPathAndPrefixes(set, "items[].id");
    assert.ok(set.has("items"), "'items' must be registered after stripping '[]'");
    assert.ok(set.has("items.id"));
    assert.ok(set.has("id"));
    assert.ok(!set.has("items[]"), "bracket-suffixed form must NOT appear in the set");
  });

  it("handles a bare [] path (array root)", () => {
    // An arrow that targets the root of a list ("items[]") should register "items".
    const set = new Set();
    addPathAndPrefixes(set, "items[]");
    assert.ok(set.has("items"));
  });

  it("does nothing for an empty string", () => {
    // Empty paths can arise from malformed arrows; the function must be safe.
    const set = new Set();
    addPathAndPrefixes(set, "");
    assert.equal(set.size, 0);
  });

  it("is idempotent — adding the same path twice does not grow the set", () => {
    // Multiple arrows can target the same path; the set size should not change.
    const set = new Set();
    addPathAndPrefixes(set, "name");
    const sizeAfterFirst = set.size;
    addPathAndPrefixes(set, "name");
    assert.equal(set.size, sizeAfterFirst);
  });
});
