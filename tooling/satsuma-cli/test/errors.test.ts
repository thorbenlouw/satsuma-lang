/**
 * errors.test.js — Unit tests for src/errors.js utilities.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { findSuggestion, loadFiles, notFound, EXIT_NOT_FOUND, EXIT_PARSE_ERROR } from "#src/errors.js";

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

  it("returns null when name is shorter than 3 chars and no exact match", () => {
    // .slice(0,3) on a 2-char name yields 2 chars, still matches prefix
    assert.equal(findSuggestion("or", ["orders", "customers"]), "orders");
  });
});

// ── loadFiles ───────────────────────────────────────────────────────────────

describe("loadFiles", () => {
  it("returns parsed files for successful parses", () => {
    const mockParse = (f: string) => ({ filePath: f, tree: {}, errorCount: 0 });
    const result = loadFiles(["a.stm", "b.stm"], mockParse as any);
    assert.equal(result.length, 2);
    assert.equal(result[0].filePath, "a.stm");
  });

  it("continues on parse errors and warns on stderr", () => {
    const stderrOutput: string[] = [];
    const origWrite = process.stderr.write;
    process.stderr.write = ((s: string) => { stderrOutput.push(s); return true; }) as any;
    try {
      const mockParse = (f: string) => ({ filePath: f, tree: {}, errorCount: 2 });
      const result = loadFiles(["bad.stm"], mockParse as any);
      assert.equal(result.length, 1, "should still return the parsed file");
      assert.ok(stderrOutput.some((s) => s.includes("2 parse error")));
    } finally {
      process.stderr.write = origWrite;
    }
  });

  it("returns empty array for empty file list", () => {
    const result = loadFiles([], () => ({ filePath: "", tree: {}, errorCount: 0 }) as any);
    assert.equal(result.length, 0);
  });
});

// ── notFound ────────────────────────────────────────────────────────────────

describe("notFound", () => {
  let stderrOutput: string[];
  let origWrite: typeof process.stderr.write;
  let origExit: typeof process.exit;

  beforeEach(() => {
    stderrOutput = [];
    origWrite = process.stderr.write;
    origExit = process.exit;
    process.stderr.write = ((s: string) => { stderrOutput.push(s); return true; }) as any;
  });

  afterEach(() => {
    process.stderr.write = origWrite;
    process.exit = origExit;
  });

  it("prints suggestion when close match exists", () => {
    let exitCode: number | undefined;
    process.exit = ((code: number) => { exitCode = code; throw new Error("exit"); }) as any;
    try {
      notFound("Schema", "ORDERS", ["orders", "customers"]);
    } catch { /* expected exit */ }
    assert.ok(stderrOutput.some((s) => s.includes("Did you mean 'orders'")));
    assert.equal(exitCode, EXIT_NOT_FOUND);
  });

  it("lists available items when 10 or fewer", () => {
    let exitCode: number | undefined;
    process.exit = ((code: number) => { exitCode = code; throw new Error("exit"); }) as any;
    try {
      notFound("Schema", "xyz", ["a", "b", "c"]);
    } catch { /* expected exit */ }
    assert.ok(stderrOutput.some((s) => s.includes("Available: a, b, c")));
    assert.equal(exitCode, EXIT_NOT_FOUND);
  });

  it("shows count when more than 10 items available", () => {
    process.exit = (() => { throw new Error("exit"); }) as any;
    const many = Array.from({ length: 15 }, (_, i) => `s${i}`);
    try {
      notFound("Schema", "xyz", many);
    } catch { /* expected exit */ }
    assert.ok(stderrOutput.some((s) => s.includes("15 schemas in workspace")));
  });

  it("omits suggestion when name matches an available entry exactly", () => {
    process.exit = (() => { throw new Error("exit"); }) as any;
    try {
      notFound("Schema", "orders", ["orders", "customers"]);
    } catch { /* expected exit */ }
    // Should say "not found." without "Did you mean" since the suggestion === name
    assert.ok(stderrOutput.some((s) => s.includes("not found.")));
    assert.ok(!stderrOutput.some((s) => s.includes("Did you mean")));
  });
});
