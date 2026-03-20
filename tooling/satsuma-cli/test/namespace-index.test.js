/**
 * namespace-index.test.js — Tests for namespace-aware index building and validation
 *
 * Covers:
 * - Namespace-qualified index keys (ns::name)
 * - Per-namespace duplicate detection
 * - Same names across different namespaces (no conflict)
 * - Namespace metadata merging and conflict detection
 * - Namespace-aware reference resolution in validator
 * - Hint suggestions for unresolved references
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildIndex } from "../src/index-builder.js";
import { collectSemanticWarnings } from "../src/validate.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

/**
 * Build pre-extracted file data for buildIndex.
 * Simulates what extractFileData returns for a single file.
 */
function makeFileData({
  filePath = "test.stm",
  schemas = [],
  metrics = [],
  mappings = [],
  fragments = [],
  transforms = [],
  namespaces = [],
  arrowRecords = [],
  warnings = [],
  questions = [],
  errorCount = 0,
}) {
  return {
    filePath,
    errorCount,
    schemas,
    metrics,
    mappings,
    fragments,
    transforms,
    warnings,
    questions,
    arrowRecords,
    namespaces,
  };
}

// ── Index key generation ─────────────────────────────────────────────────────

describe("namespace-qualified index keys", () => {
  it("stores global schemas under bare name", () => {
    const data = makeFileData({
      schemas: [{ name: "orders", namespace: null, fields: [], row: 0 }],
    });
    const index = buildIndex([data]);
    assert.ok(index.schemas.has("orders"), "Global schema should use bare name key");
    assert.ok(!index.schemas.has("null::orders"));
  });

  it("stores namespaced schemas under ns::name", () => {
    const data = makeFileData({
      schemas: [{ name: "stores", namespace: "pos", fields: [], row: 0 }],
    });
    const index = buildIndex([data]);
    assert.ok(index.schemas.has("pos::stores"), "Namespaced schema should use ns::name key");
    assert.ok(!index.schemas.has("stores"), "Should not also store under bare name");
  });

  it("stores mixed global and namespaced entities", () => {
    const data = makeFileData({
      schemas: [
        { name: "dim_date", namespace: null, fields: [], row: 0 },
        { name: "stores", namespace: "pos", fields: [], row: 5 },
        { name: "orders", namespace: "ecom", fields: [], row: 10 },
      ],
    });
    const index = buildIndex([data]);
    assert.ok(index.schemas.has("dim_date"));
    assert.ok(index.schemas.has("pos::stores"));
    assert.ok(index.schemas.has("ecom::orders"));
    assert.equal(index.schemas.size, 3);
  });

  it("applies ns::name keys to all entity types", () => {
    const data = makeFileData({
      schemas: [{ name: "s", namespace: "ns", fields: [], row: 0 }],
      metrics: [{ name: "m", namespace: "ns", sources: [], fields: [], row: 1 }],
      mappings: [{ name: "map", namespace: "ns", sources: [], targets: [], arrowCount: 0, row: 2 }],
      fragments: [{ name: "f", namespace: "ns", fields: [], row: 3 }],
      transforms: [{ name: "t", namespace: "ns", row: 4 }],
    });
    const index = buildIndex([data]);
    assert.ok(index.schemas.has("ns::s"));
    assert.ok(index.metrics.has("ns::m"));
    assert.ok(index.mappings.has("ns::map"));
    assert.ok(index.fragments.has("ns::f"));
    assert.ok(index.transforms.has("ns::t"));
  });
});

// ── Per-namespace duplicate detection ────────────────────────────────────────

describe("per-namespace duplicate detection", () => {
  it("detects duplicate within the same namespace", () => {
    const data1 = makeFileData({
      filePath: "a.stm",
      schemas: [{ name: "stores", namespace: "pos", fields: [], row: 0 }],
    });
    const data2 = makeFileData({
      filePath: "b.stm",
      schemas: [{ name: "stores", namespace: "pos", fields: [], row: 5 }],
    });
    const index = buildIndex([data1, data2]);
    assert.equal(index.duplicates.length, 1);
    assert.equal(index.duplicates[0].name, "pos::stores");
  });

  it("allows same name in different namespaces", () => {
    const data = makeFileData({
      schemas: [
        { name: "customer", namespace: "crm", fields: [], row: 0 },
        { name: "customer", namespace: "billing", fields: [], row: 5 },
      ],
    });
    const index = buildIndex([data]);
    assert.equal(index.duplicates.length, 0, "Same name in different namespaces should not conflict");
    assert.ok(index.schemas.has("crm::customer"));
    assert.ok(index.schemas.has("billing::customer"));
  });

  it("allows same name in a namespace and global", () => {
    const data = makeFileData({
      schemas: [
        { name: "customer", namespace: null, fields: [], row: 0 },
        { name: "customer", namespace: "crm", fields: [], row: 5 },
      ],
    });
    const index = buildIndex([data]);
    assert.equal(index.duplicates.length, 0, "Same name in namespace and global should not conflict");
    assert.ok(index.schemas.has("customer"));
    assert.ok(index.schemas.has("crm::customer"));
  });

  it("detects cross-kind duplicates within a namespace", () => {
    const data = makeFileData({
      schemas: [{ name: "customer", namespace: "crm", fields: [], row: 0 }],
      metrics: [{ name: "customer", namespace: "crm", sources: [], fields: [], row: 5 }],
    });
    const index = buildIndex([data]);
    assert.equal(index.duplicates.length, 1);
    assert.equal(index.duplicates[0].kind, "metric");
    assert.equal(index.duplicates[0].previousKind, "schema");
    assert.equal(index.duplicates[0].name, "crm::customer");
  });

  it("detects duplicates within the global namespace", () => {
    const data = makeFileData({
      schemas: [{ name: "customer", namespace: null, fields: [], row: 0 }],
      metrics: [{ name: "customer", namespace: null, sources: [], fields: [], row: 5 }],
    });
    const index = buildIndex([data]);
    assert.equal(index.duplicates.length, 1);
    assert.equal(index.duplicates[0].name, "customer");
  });

  it("does not flag cross-kind duplicates across different namespaces", () => {
    const data = makeFileData({
      schemas: [{ name: "customer", namespace: "crm", fields: [], row: 0 }],
      metrics: [{ name: "customer", namespace: "billing", sources: [], fields: [], row: 5 }],
    });
    const index = buildIndex([data]);
    assert.equal(index.duplicates.length, 0);
  });
});

// ── Namespace metadata merging ───────────────────────────────────────────────

describe("namespace metadata merging", () => {
  it("allows same note restated across blocks", () => {
    const data1 = makeFileData({
      filePath: "a.stm",
      namespaces: [{ name: "pos", note: "Oracle Retail POS", row: 0 }],
      schemas: [{ name: "stores", namespace: "pos", fields: [], row: 1 }],
    });
    const data2 = makeFileData({
      filePath: "b.stm",
      namespaces: [{ name: "pos", note: "Oracle Retail POS", row: 0 }],
      schemas: [{ name: "txns", namespace: "pos", fields: [], row: 1 }],
    });
    const index = buildIndex([data1, data2]);
    const metaConflicts = index.duplicates.filter((d) => d.kind === "namespace-metadata");
    assert.equal(metaConflicts.length, 0, "Same note value should not conflict");
  });

  it("allows one block with note, another without", () => {
    const data1 = makeFileData({
      filePath: "a.stm",
      namespaces: [{ name: "pos", note: "Oracle Retail POS", row: 0 }],
    });
    const data2 = makeFileData({
      filePath: "b.stm",
      namespaces: [{ name: "pos", note: null, row: 0 }],
    });
    const index = buildIndex([data1, data2]);
    const metaConflicts = index.duplicates.filter((d) => d.kind === "namespace-metadata");
    assert.equal(metaConflicts.length, 0);
  });

  it("detects conflicting note values", () => {
    const data1 = makeFileData({
      filePath: "a.stm",
      namespaces: [{ name: "pos", note: "Oracle Retail POS", row: 0 }],
    });
    const data2 = makeFileData({
      filePath: "b.stm",
      namespaces: [{ name: "pos", note: "POS system", row: 5 }],
    });
    const index = buildIndex([data1, data2]);
    const metaConflicts = index.duplicates.filter((d) => d.kind === "namespace-metadata");
    assert.equal(metaConflicts.length, 1);
    assert.equal(metaConflicts[0].name, "pos");
    assert.equal(metaConflicts[0].tag, "note");
    assert.equal(metaConflicts[0].value, "POS system");
    assert.equal(metaConflicts[0].previousValue, "Oracle Retail POS");
  });
});

// ── Namespace names tracking ─────────────────────────────────────────────────

describe("namespaceNames set", () => {
  it("collects all namespace names", () => {
    const data = makeFileData({
      schemas: [
        { name: "s1", namespace: "pos", fields: [], row: 0 },
        { name: "s2", namespace: "ecom", fields: [], row: 5 },
        { name: "s3", namespace: null, fields: [], row: 10 },
      ],
    });
    const index = buildIndex([data]);
    assert.ok(index.namespaceNames.has("pos"));
    assert.ok(index.namespaceNames.has("ecom"));
    assert.ok(!index.namespaceNames.has("__global__"));
    assert.equal(index.namespaceNames.size, 2);
  });
});

// ── Namespace-aware validator: reference resolution ──────────────────────────

describe("namespace-aware reference resolution", () => {
  it("resolves local namespace reference", () => {
    const data = makeFileData({
      schemas: [
        { name: "pos_oracle", namespace: "pos", fields: [], row: 0 },
        { name: "hub_store", namespace: "vault", fields: [], row: 5 },
      ],
      mappings: [{
        name: "load",
        namespace: "vault",
        sources: ["pos::pos_oracle"],
        targets: ["hub_store"],
        arrowCount: 0,
        row: 10,
      }],
    });
    const index = buildIndex([data]);
    const warnings = collectSemanticWarnings(index);
    const refWarnings = warnings.filter((w) => w.rule === "undefined-ref");
    assert.equal(refWarnings.length, 0, "Qualified source and local target should resolve");
  });

  it("resolves global reference from inside a namespace", () => {
    const data = makeFileData({
      schemas: [
        { name: "shared_lookup", namespace: null, fields: [], row: 0 },
        { name: "hub_store", namespace: "vault", fields: [], row: 5 },
      ],
      mappings: [{
        name: "load",
        namespace: "vault",
        sources: ["shared_lookup"],
        targets: ["hub_store"],
        arrowCount: 0,
        row: 10,
      }],
    });
    const index = buildIndex([data]);
    const warnings = collectSemanticWarnings(index);
    const refWarnings = warnings.filter((w) => w.rule === "undefined-ref");
    assert.equal(refWarnings.length, 0, "Global reference should resolve from inside namespace");
  });

  it("warns for unqualified reference to another namespace", () => {
    const data = makeFileData({
      schemas: [
        { name: "pos_oracle", namespace: "pos", fields: [], row: 0 },
        { name: "hub_store", namespace: "vault", fields: [], row: 5 },
      ],
      mappings: [{
        name: "bad_ref",
        namespace: "vault",
        sources: ["pos_oracle"],
        targets: ["hub_store"],
        arrowCount: 0,
        row: 10,
      }],
    });
    const index = buildIndex([data]);
    const warnings = collectSemanticWarnings(index);
    const refWarnings = warnings.filter((w) => w.rule === "undefined-ref");
    assert.equal(refWarnings.length, 1, "Unqualified cross-namespace ref should warn");
    assert.ok(refWarnings[0].message.includes("pos_oracle"));
  });

  it("provides hints for unresolved references", () => {
    const data = makeFileData({
      schemas: [
        { name: "customer", namespace: "crm", fields: [], row: 0 },
        { name: "customer", namespace: "billing", fields: [], row: 5 },
        { name: "target", namespace: null, fields: [], row: 10 },
      ],
      mappings: [{
        name: "load",
        namespace: null,
        sources: ["customer"],
        targets: ["target"],
        arrowCount: 0,
        row: 15,
      }],
    });
    const index = buildIndex([data]);
    const warnings = collectSemanticWarnings(index);
    const refWarnings = warnings.filter((w) => w.rule === "undefined-ref");
    assert.equal(refWarnings.length, 1);
    assert.ok(refWarnings[0].message.includes("hint"), "Should include a hint");
    assert.ok(refWarnings[0].message.includes("crm::customer") || refWarnings[0].message.includes("billing::customer"));
  });

  it("resolves qualified reference directly", () => {
    const data = makeFileData({
      schemas: [
        { name: "pos_oracle", namespace: "pos", fields: [], row: 0 },
        { name: "target", namespace: null, fields: [], row: 5 },
      ],
      mappings: [{
        name: "load",
        namespace: null,
        sources: ["pos::pos_oracle"],
        targets: ["target"],
        arrowCount: 0,
        row: 10,
      }],
    });
    const index = buildIndex([data]);
    const warnings = collectSemanticWarnings(index);
    const refWarnings = warnings.filter((w) => w.rule === "undefined-ref");
    assert.equal(refWarnings.length, 0, "Qualified reference should resolve directly");
  });

  it("warns for qualified reference to non-existent namespace", () => {
    const data = makeFileData({
      schemas: [
        { name: "target", namespace: null, fields: [], row: 0 },
      ],
      mappings: [{
        name: "load",
        namespace: null,
        sources: ["nonexistent::schema"],
        targets: ["target"],
        arrowCount: 0,
        row: 5,
      }],
    });
    const index = buildIndex([data]);
    const warnings = collectSemanticWarnings(index);
    const refWarnings = warnings.filter((w) => w.rule === "undefined-ref");
    assert.equal(refWarnings.length, 1);
    assert.ok(refWarnings[0].message.includes("nonexistent::schema"));
  });
});

// ── Namespace metadata conflict validation ───────────────────────────────────

describe("namespace metadata conflict diagnostics", () => {
  it("emits namespace-metadata-conflict error", () => {
    const data1 = makeFileData({
      filePath: "a.stm",
      namespaces: [{ name: "pos", note: "Oracle Retail POS", row: 0 }],
    });
    const data2 = makeFileData({
      filePath: "b.stm",
      namespaces: [{ name: "pos", note: "Different POS note", row: 5 }],
    });
    const index = buildIndex([data1, data2]);
    const warnings = collectSemanticWarnings(index);
    const metaErrors = warnings.filter((w) => w.rule === "namespace-metadata-conflict");
    assert.equal(metaErrors.length, 1);
    assert.equal(metaErrors[0].severity, "error");
    assert.ok(metaErrors[0].message.includes("pos"));
    assert.ok(metaErrors[0].message.includes("note"));
  });
});

// ── Backward compatibility: existing non-namespace behavior ──────────────────

describe("backward compatibility: global-only workspaces", () => {
  it("works identically for files without namespaces", () => {
    const data = makeFileData({
      schemas: [
        { name: "orders", namespace: null, fields: [{ name: "id", type: "INT" }], row: 0 },
        { name: "customers", namespace: null, fields: [{ name: "name", type: "VARCHAR" }], row: 5 },
      ],
      mappings: [{
        name: "load",
        namespace: null,
        sources: ["orders"],
        targets: ["customers"],
        arrowCount: 0,
        row: 10,
      }],
    });
    const index = buildIndex([data]);
    assert.ok(index.schemas.has("orders"));
    assert.ok(index.schemas.has("customers"));
    const warnings = collectSemanticWarnings(index);
    const refWarnings = warnings.filter((w) => w.rule === "undefined-ref");
    assert.equal(refWarnings.length, 0);
  });

  it("detects duplicates in global namespace as before", () => {
    const data1 = makeFileData({
      filePath: "a.stm",
      schemas: [{ name: "orders", namespace: null, fields: [], row: 0 }],
    });
    const data2 = makeFileData({
      filePath: "b.stm",
      schemas: [{ name: "orders", namespace: null, fields: [], row: 5 }],
    });
    const index = buildIndex([data1, data2]);
    assert.equal(index.duplicates.length, 1);
    assert.equal(index.duplicates[0].name, "orders");
  });
});
