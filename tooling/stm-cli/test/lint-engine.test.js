/**
 * lint-engine.test.js — Unit tests for lint rules and engine
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runLint, applyFixes } from "../src/lint-engine.js";

/** Build a minimal WorkspaceIndex for lint testing. */
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
  };
}

// ── hidden-source-in-nl ────────────────────────────────────────────────────

describe("lint: hidden-source-in-nl", () => {
  it("flags NL reference to schema not in source list", () => {
    const index = makeIndex({
      schemas: [
        { name: "source::hr_employees", fields: [{ name: "department" }, { name: "employee_id" }] },
        { name: "source::finance_gl", fields: [{ name: "posted_by" }] },
        { name: "staging::stg_gl", fields: [{ name: "department" }] },
      ],
      mappings: [{
        name: "staging::stage gl",
        namespace: "staging",
        sources: ["source::finance_gl"],
        targets: ["staging::stg_gl"],
      }],
      nlRefData: [{
        text: "Lookup `department` from `source::hr_employees`",
        mapping: "stage gl",
        namespace: "staging",
        targetField: "department",
        file: "test.stm",
        line: 10,
        column: 6,
      }],
    });

    const diags = runLint(index, { select: ["hidden-source-in-nl"] });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].rule, "hidden-source-in-nl");
    assert.equal(diags[0].fixable, true);
    assert.ok(diags[0].fix);
  });

  it("does not flag schema already in source list", () => {
    const index = makeIndex({
      schemas: [
        { name: "source::finance_gl", fields: [{ name: "posted_by" }] },
        { name: "staging::stg_gl", fields: [{ name: "department" }] },
      ],
      mappings: [{
        name: "staging::stage gl",
        namespace: "staging",
        sources: ["source::finance_gl"],
        targets: ["staging::stg_gl"],
      }],
      nlRefData: [{
        text: "Copy from `source::finance_gl`",
        mapping: "stage gl",
        namespace: "staging",
        targetField: "department",
        file: "test.stm",
        line: 10,
        column: 6,
      }],
    });

    const diags = runLint(index, { select: ["hidden-source-in-nl"] });
    assert.equal(diags.length, 0);
  });

  it("fix adds schema to source block", () => {
    const source = [
      "mapping 'stage gl' {",
      "  source { source::finance_gl }",
      "  target { staging::stg_gl }",
      "}",
    ].join("\n");

    const index = makeIndex({
      schemas: [
        { name: "source::hr_employees", fields: [{ name: "department" }] },
        { name: "source::finance_gl", fields: [{ name: "posted_by" }] },
        { name: "staging::stg_gl", fields: [{ name: "department" }] },
      ],
      mappings: [{
        name: "stage gl",
        sources: ["source::finance_gl"],
        targets: ["staging::stg_gl"],
      }],
      nlRefData: [{
        text: "Lookup from `source::hr_employees`",
        mapping: "stage gl",
        namespace: null,
        targetField: "department",
        file: "test.stm",
        line: 10,
        column: 6,
      }],
    });

    const diags = runLint(index, { select: ["hidden-source-in-nl"] });
    assert.equal(diags.length, 1);

    const sourceByFile = new Map([["test.stm", source]]);
    const { fixedFiles, appliedFixes } = applyFixes(sourceByFile, diags);

    assert.equal(appliedFixes.length, 1);
    assert.ok(fixedFiles.has("test.stm"));
    const fixed = fixedFiles.get("test.stm");
    assert.match(fixed, /source \{ source::finance_gl, source::hr_employees \}/);
  });

  it("fix is idempotent", () => {
    // After fix, hr_employees is already in source list — no diagnostic expected
    const index = makeIndex({
      schemas: [
        { name: "source::hr_employees", fields: [{ name: "department" }] },
        { name: "source::finance_gl", fields: [{ name: "posted_by" }] },
        { name: "staging::stg_gl", fields: [{ name: "department" }] },
      ],
      mappings: [{
        name: "stage gl",
        sources: ["source::finance_gl", "source::hr_employees"],
        targets: ["staging::stg_gl"],
      }],
      nlRefData: [{
        text: "Lookup from `source::hr_employees`",
        mapping: "stage gl",
        namespace: null,
        targetField: "department",
        file: "test.stm",
        line: 10,
        column: 6,
      }],
    });

    // After fix, schema is in source list so no diagnostics
    const diags = runLint(index, { select: ["hidden-source-in-nl"] });
    assert.equal(diags.length, 0);
  });
});

// ── unresolved-nl-ref ──────────────────────────────────────────────────────

describe("lint: unresolved-nl-ref", () => {
  it("flags unresolved backtick reference", () => {
    const index = makeIndex({
      schemas: [
        { name: "source::orders", fields: [{ name: "order_id" }] },
        { name: "staging::stg_orders", fields: [{ name: "order_id" }] },
      ],
      mappings: [{
        name: "staging::stage orders",
        namespace: "staging",
        sources: ["source::orders"],
        targets: ["staging::stg_orders"],
      }],
      nlRefData: [{
        text: "Lookup from `nonexistent_thing`",
        mapping: "stage orders",
        namespace: "staging",
        targetField: "order_id",
        file: "test.stm",
        line: 5,
        column: 6,
      }],
    });

    const diags = runLint(index, { select: ["unresolved-nl-ref"] });
    assert.equal(diags.length, 1);
    assert.equal(diags[0].rule, "unresolved-nl-ref");
    assert.equal(diags[0].fixable, false);
  });

  it("does not flag resolved references", () => {
    const index = makeIndex({
      schemas: [
        { name: "source::orders", fields: [{ name: "order_id" }] },
        { name: "staging::stg_orders", fields: [{ name: "order_id" }] },
      ],
      mappings: [{
        name: "staging::stage orders",
        namespace: "staging",
        sources: ["source::orders"],
        targets: ["staging::stg_orders"],
      }],
      nlRefData: [{
        text: "Copy `order_id` from source",
        mapping: "stage orders",
        namespace: "staging",
        targetField: "order_id",
        file: "test.stm",
        line: 5,
        column: 6,
      }],
    });

    const diags = runLint(index, { select: ["unresolved-nl-ref"] });
    assert.equal(diags.length, 0);
  });
});

// ── Engine: select / ignore ────────────────────────────────────────────────

describe("lint engine: rule filtering", () => {
  it("--select filters to specified rules", () => {
    const index = makeIndex();
    const diags = runLint(index, { select: ["hidden-source-in-nl"] });
    // No findings on empty index, but should not throw
    assert.ok(Array.isArray(diags));
  });

  it("--ignore excludes specified rules", () => {
    const index = makeIndex({
      schemas: [
        { name: "source::orders", fields: [{ name: "order_id" }] },
        { name: "staging::stg_orders", fields: [{ name: "order_id" }] },
      ],
      mappings: [{
        name: "staging::stage orders",
        namespace: "staging",
        sources: ["source::orders"],
        targets: ["staging::stg_orders"],
      }],
      nlRefData: [{
        text: "Lookup from `nonexistent_thing`",
        mapping: "stage orders",
        namespace: "staging",
        targetField: "order_id",
        file: "test.stm",
        line: 5,
        column: 6,
      }],
    });

    const all = runLint(index);
    const filtered = runLint(index, { ignore: ["unresolved-nl-ref"] });
    assert.ok(all.length > filtered.length);
  });
});

// ── Engine: diagnostics shape ──────────────────────────────────────────────

describe("lint diagnostic shape", () => {
  it("includes all required fields", () => {
    const index = makeIndex({
      schemas: [
        { name: "source::orders", fields: [{ name: "order_id" }] },
        { name: "staging::stg_orders", fields: [{ name: "order_id" }] },
      ],
      mappings: [{
        name: "staging::stage orders",
        namespace: "staging",
        sources: ["source::orders"],
        targets: ["staging::stg_orders"],
      }],
      nlRefData: [{
        text: "Lookup from `nonexistent_thing`",
        mapping: "stage orders",
        namespace: "staging",
        targetField: "order_id",
        file: "test.stm",
        line: 5,
        column: 6,
      }],
    });

    const diags = runLint(index);
    assert.ok(diags.length > 0);
    const d = diags[0];
    assert.equal(typeof d.file, "string");
    assert.equal(typeof d.line, "number");
    assert.equal(typeof d.column, "number");
    assert.ok(["error", "warning"].includes(d.severity));
    assert.equal(typeof d.rule, "string");
    assert.equal(typeof d.message, "string");
    assert.equal(typeof d.fixable, "boolean");
  });
});
