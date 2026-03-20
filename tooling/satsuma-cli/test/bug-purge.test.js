/**
 * bug-purge.test.js — Regression tests for bug fixes
 *
 * sl-5dyc: Import warnings go to stderr, not stdout
 * sl-j1eb: graph --json no doubled schema prefix for multi-source mappings
 * sl-bl5e: graph --json no double-dot paths for nested fields
 * sl-n464: graph --schema-only aggregates field edges to schema level
 * sl-04pv: hidden-source-in-nl fires on bare and dotted-field refs
 * sl-80jy: unresolved-nl-ref no false positive on valid dotted-field refs
 * sl-j8uk: Filesystem errors exit code 2
 */

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runLint } from "#src/lint-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, "../dist/index.js");
const EXAMPLES = resolve(__dirname, "../../../examples");

function run(...args) {
  return new Promise((resolve) => {
    execFile("node", [CLI, ...args], { timeout: 15_000 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        code: err ? err.code ?? 1 : 0,
      });
    });
  });
}

function makeIndex({ schemas = [], mappings = [], nlRefData = [] } = {}) {
  const schemaMap = new Map();
  for (const s of schemas) {
    schemaMap.set(s.name, { ...s, file: s.file ?? "test.stm", row: s.row ?? 0 });
  }
  const mappingMap = new Map();
  for (const m of mappings) {
    mappingMap.set(m.name, { ...m, file: m.file ?? "test.stm", row: m.row ?? 0 });
  }
  return {
    schemas: schemaMap,
    mappings: mappingMap,
    metrics: new Map(),
    fragments: new Map(),
    transforms: new Map(),
    warnings: [],
    questions: [],
    fieldArrows: new Map(),
    referenceGraph: { usedByMappings: new Map(), fragmentsUsedIn: new Map(), metricsReferences: new Map() },
    namespaceNames: new Set(),
    nlRefData,
    totalErrors: 0,
    duplicates: [],
  };
}

// ── sl-5dyc: Import warnings on stderr ────────────────────────────────────

describe("sl-5dyc: import warnings go to stderr", () => {
  it("--json stdout is valid JSON even with import warnings", async () => {
    const { stdout, stderr } = await run("summary", "--json", resolve(EXAMPLES, "db-to-db.stm"));
    // Warning should be on stderr
    assert.match(stderr, /warning.*import target/);
    // Stdout should be valid JSON
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.schemas);
  });

  it("graph --json stdout is valid JSON even with import warnings", async () => {
    const { stdout, stderr } = await run("graph", "--json", resolve(EXAMPLES, "db-to-db.stm"));
    assert.match(stderr, /warning.*import target/);
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.version);
    assert.ok(parsed.nodes);
  });
});

// ── sl-j1eb: No doubled schema prefix in graph edges ──────────────────────

describe("sl-j1eb: graph --json no doubled schema prefix", () => {
  it("multi-source mapping arrows use schema.field, not schema.schema.field", async () => {
    const { stdout, code } = await run("graph", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);

    for (const edge of data.edges) {
      if (edge.from) {
        const parts = edge.from.split(".");
        if (parts.length >= 2) {
          assert.notEqual(parts[0], parts[1],
            `Doubled schema prefix in from: ${edge.from}`);
        }
      }
      if (edge.to) {
        const parts = edge.to.split(".");
        if (parts.length >= 2) {
          assert.notEqual(parts[0], parts[1],
            `Doubled schema prefix in to: ${edge.to}`);
        }
      }
    }
  });
});

// ── sl-bl5e: No double-dot paths in graph edges ──────────────────────────

describe("sl-bl5e: graph --json no double-dot paths", () => {
  it("nested field paths have no '..' separators", async () => {
    const { stdout, code } = await run("graph", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);

    for (const edge of data.edges) {
      if (edge.from) {
        assert.ok(!edge.from.includes(".."),
          `Double-dot in from: ${edge.from}`);
      }
      if (edge.to) {
        assert.ok(!edge.to.includes(".."),
          `Double-dot in to: ${edge.to}`);
      }
    }
  });
});

// ── sl-n464: graph --schema-only aggregates edges ─────────────────────────

describe("sl-n464: graph --schema-only aggregates field edges", () => {
  it("returns non-zero edges", async () => {
    const { stdout, code } = await run("graph", "--schema-only", "--json", EXAMPLES);
    assert.equal(code, 0);
    const data = JSON.parse(stdout);
    assert.ok(data.edges.length > 0, "should have aggregated edges");
  });

  it("edges are schema-level (no dotted field paths)", async () => {
    const { stdout } = await run("graph", "--schema-only", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    for (const edge of data.edges) {
      if (edge.from) {
        assert.ok(!edge.from.includes("."),
          `Edge from should be schema-level: ${edge.from}`);
      }
      if (edge.to) {
        assert.ok(!edge.to.includes("."),
          `Edge to should be schema-level: ${edge.to}`);
      }
    }
  });

  it("deduplicates schema-pair edges from multiple field arrows", async () => {
    const { stdout } = await run("graph", "--schema-only", "--json", EXAMPLES);
    const data = JSON.parse(stdout);
    // Same schema pair + mapping should not appear multiple times
    const seen = new Set();
    for (const edge of data.edges) {
      const key = `${edge.from}->${edge.to}:${edge.mapping}`;
      assert.ok(!seen.has(key), `Duplicate edge: ${key}`);
      seen.add(key);
    }
  });
});

// ── sl-04pv: hidden-source-in-nl fires on bare schema refs ────────────────

describe("sl-04pv: hidden-source-in-nl fires on bare and dotted refs", () => {
  it("fires on bare schema name not in source list", () => {
    const index = makeIndex({
      schemas: [
        { name: "src", fields: [{ name: "id" }] },
        { name: "hidden", fields: [{ name: "code" }] },
        { name: "tgt", fields: [{ name: "id" }] },
      ],
      mappings: [{
        name: "test",
        sources: ["src"],
        targets: ["tgt"],
      }],
      nlRefData: [{
        text: "Look up `hidden` to get the code",
        mapping: "test",
        namespace: null,
        targetField: "id",
        file: "test.stm",
        line: 10,
        column: 0,
      }],
    });

    const diags = runLint(index, { select: ["hidden-source-in-nl"] });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].rule, "hidden-source-in-nl");
  });

  it("fires on dotted-field ref where schema not in source list", () => {
    const index = makeIndex({
      schemas: [
        { name: "src", fields: [{ name: "id" }] },
        { name: "hidden", fields: [{ name: "code" }] },
        { name: "tgt", fields: [{ name: "id" }] },
      ],
      mappings: [{
        name: "test",
        sources: ["src"],
        targets: ["tgt"],
      }],
      nlRefData: [{
        text: "Use `hidden.code` for the value",
        mapping: "test",
        namespace: null,
        targetField: "id",
        file: "test.stm",
        line: 10,
        column: 0,
      }],
    });

    const diags = runLint(index, { select: ["hidden-source-in-nl"] });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].rule, "hidden-source-in-nl");
  });

  it("does not fire when schema is in source list", () => {
    const index = makeIndex({
      schemas: [
        { name: "src", fields: [{ name: "id" }] },
        { name: "tgt", fields: [{ name: "id" }] },
      ],
      mappings: [{
        name: "test",
        sources: ["src"],
        targets: ["tgt"],
      }],
      nlRefData: [{
        text: "Copy `src.id` value",
        mapping: "test",
        namespace: null,
        targetField: "id",
        file: "test.stm",
        line: 10,
        column: 0,
      }],
    });

    const diags = runLint(index, { select: ["hidden-source-in-nl"] });
    assert.equal(diags.length, 0);
  });
});

// ── sl-80jy: unresolved-nl-ref no false positive on valid dotted refs ─────

describe("sl-80jy: unresolved-nl-ref no false positive on dotted-field", () => {
  it("does not fire on valid schema.field ref even when schema not in source list", () => {
    const index = makeIndex({
      schemas: [
        { name: "src", fields: [{ name: "id" }] },
        { name: "hidden", fields: [{ name: "code" }] },
        { name: "tgt", fields: [{ name: "id" }] },
      ],
      mappings: [{
        name: "test",
        sources: ["src"],
        targets: ["tgt"],
      }],
      nlRefData: [{
        text: "Use `hidden.code` for the value",
        mapping: "test",
        namespace: null,
        targetField: "id",
        file: "test.stm",
        line: 10,
        column: 0,
      }],
    });

    const diags = runLint(index, { select: ["unresolved-nl-ref"] });
    assert.equal(diags.length, 0, "should not flag valid schema.field ref");
  });

  it("still fires on truly unresolved references", () => {
    const index = makeIndex({
      schemas: [
        { name: "src", fields: [{ name: "id" }] },
        { name: "tgt", fields: [{ name: "id" }] },
      ],
      mappings: [{
        name: "test",
        sources: ["src"],
        targets: ["tgt"],
      }],
      nlRefData: [{
        text: "Use `nonexistent.field` for the value",
        mapping: "test",
        namespace: null,
        targetField: "id",
        file: "test.stm",
        line: 10,
        column: 0,
      }],
    });

    const diags = runLint(index, { select: ["unresolved-nl-ref"] });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].rule, "unresolved-nl-ref");
  });
});

// ── sl-j8uk: Filesystem errors exit code 2 ────────────────────────────────

describe("sl-j8uk: filesystem errors exit code 2", () => {
  it("summary exits 2 for nonexistent path", async () => {
    const { code } = await run("summary", "/nonexistent/path");
    assert.equal(code, 2);
  });

  it("graph exits 2 for nonexistent path", async () => {
    const { code } = await run("graph", "/nonexistent/path");
    assert.equal(code, 2);
  });

  it("schema exits 2 for nonexistent path", async () => {
    const { code } = await run("schema", "any_schema", "/nonexistent/path");
    assert.equal(code, 2);
  });

  it("lint exits 2 for nonexistent path", async () => {
    const { code } = await run("lint", "/nonexistent/path");
    assert.equal(code, 2);
  });

  it("not-found schema still exits 1", async () => {
    const { code } = await run("schema", "nonexistent_schema_name", EXAMPLES);
    assert.equal(code, 1);
  });
});
