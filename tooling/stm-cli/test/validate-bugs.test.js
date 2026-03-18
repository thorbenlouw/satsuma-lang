/**
 * validate-bugs.test.js — Tests for validator false-positive bug fixes
 *
 * Covers:
 * - Bug 1: Nested record/list field path resolution
 * - Bug 2: Schema-qualified references in multi-source mappings
 * - Bug 3: Metric source extraction (keyword vs value, block form)
 * - Bug 4: Suppress field-not-in-schema for schemas with unresolved spreads
 * - Bug 5: Duplicate warning elimination
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectSemanticWarnings } from "../src/validate.js";
import { extractSchemas, extractMetrics } from "../src/extract.js";

// ── Mock helpers ─────────────────────────────────────────────────────────────

function n(type, namedChildren = [], text = "", row = 0) {
  return { type, text, startPosition: { row, column: 0 }, namedChildren };
}

function ident(text, row = 0) {
  return n("identifier", [], text, row);
}

function blockLabel(name) {
  return n("block_label", [ident(name)]);
}

function typeExpr(text) {
  return n("type_expr", [], text);
}

function fieldName(name) {
  return n("field_name", [ident(name)]);
}

function fieldDecl(name, type, row = 0) {
  return n("field_decl", [fieldName(name), typeExpr(type)], "", row);
}

function kvPair(key, valNode) {
  const kvKey = n("kv_key", [ident(key)], key);
  return n("key_value_pair", [kvKey, valNode]);
}

/** Build a minimal WorkspaceIndex for testing semantic warnings. */
function makeIndex({ schemas = [], mappings = [], metrics = [], fragments = [], fieldArrows = [] }) {
  const schemaMap = new Map();
  for (const s of schemas) {
    schemaMap.set(s.name, { ...s, file: s.file ?? "test.stm", row: s.row ?? 0 });
  }
  const mappingMap = new Map();
  for (const m of mappings) {
    mappingMap.set(m.name, { ...m, file: m.file ?? "test.stm", row: m.row ?? 0 });
  }
  const metricMap = new Map();
  for (const m of metrics) {
    metricMap.set(m.name, { ...m, file: m.file ?? "test.stm", row: m.row ?? 0 });
  }
  const fragMap = new Map();
  for (const f of fragments) {
    fragMap.set(f.name, { ...f, file: f.file ?? "test.stm", row: f.row ?? 0 });
  }
  const arrowMap = new Map();
  for (const a of fieldArrows) {
    if (a.source) {
      if (!arrowMap.has(a.source)) arrowMap.set(a.source, []);
      arrowMap.get(a.source).push(a);
    }
    if (a.target) {
      if (!arrowMap.has(a.target)) arrowMap.set(a.target, []);
      arrowMap.get(a.target).push(a);
    }
  }
  return {
    schemas: schemaMap,
    mappings: mappingMap,
    metrics: metricMap,
    fragments: fragMap,
    transforms: new Map(),
    warnings: [],
    questions: [],
    fieldArrows: arrowMap,
    referenceGraph: { usedByMappings: new Map(), fragmentsUsedIn: new Map(), metricsReferences: new Map() },
    totalErrors: 0,
  };
}

// ── Bug 1: Nested record/list field paths ─────────────────────────────────────

describe("Bug 1: nested field path resolution", () => {
  it("extracts nested record fields into a field tree", () => {
    const innerBody = n("schema_body", [
      fieldDecl("DOCNUM", "CHAR(35)"),
      fieldDecl("MESSGFUN", "CHAR(3)"),
    ]);
    const record = n("record_block", [blockLabel("BeginningOfMessage"), innerBody]);
    const outerBody = n("schema_body", [record, fieldDecl("top_field", "INT")]);
    const block = n("schema_block", [blockLabel("my_schema"), outerBody]);
    const root = n("source_file", [block]);

    const schemas = extractSchemas(root);
    assert.equal(schemas.length, 1);
    assert.equal(schemas[0].fields.length, 2); // record + top_field
    assert.equal(schemas[0].fields[0].name, "BeginningOfMessage");
    assert.equal(schemas[0].fields[0].children.length, 2);
    assert.equal(schemas[0].fields[0].children[0].name, "DOCNUM");
    assert.equal(schemas[0].fields[1].name, "top_field");
  });

  it("extracts nested list fields with isList flag", () => {
    const innerBody = n("schema_body", [fieldDecl("unit_price", "DECIMAL")]);
    const list = n("list_block", [blockLabel("CartLines"), innerBody]);
    const outerBody = n("schema_body", [list]);
    const block = n("schema_block", [blockLabel("my_schema"), outerBody]);
    const root = n("source_file", [block]);

    const schemas = extractSchemas(root);
    assert.equal(schemas[0].fields[0].isList, true);
    assert.equal(schemas[0].fields[0].children[0].name, "unit_price");
  });

  it("validates dotted paths against nested field tree", () => {
    const index = makeIndex({
      schemas: [{
        name: "src_schema",
        fields: [{
          name: "Order",
          type: "record",
          children: [
            { name: "OrderId", type: "INT" },
            { name: "Customer", type: "record", children: [
              { name: "Email", type: "STRING" },
            ] },
          ],
        }],
      }, {
        name: "tgt_schema",
        fields: [{ name: "order_id", type: "INT" }, { name: "email", type: "STRING" }],
      }],
      mappings: [{ name: "m1", sources: ["src_schema"], targets: ["tgt_schema"] }],
      fieldArrows: [
        { mapping: "m1", source: "Order.OrderId", target: "order_id", file: "test.stm", line: 10 },
        { mapping: "m1", source: "Order.Customer.Email", target: "email", file: "test.stm", line: 11 },
      ],
    });

    const warnings = collectSemanticWarnings(index);
    const fieldWarnings = warnings.filter((w) => w.rule === "field-not-in-schema");
    assert.equal(fieldWarnings.length, 0, "Nested dotted paths should resolve without warnings");
  });

  it("validates list bracket paths against nested field tree", () => {
    const index = makeIndex({
      schemas: [{
        name: "src_schema",
        fields: [{
          name: "CartLines",
          type: "list",
          isList: true,
          children: [{ name: "unit_price", type: "DECIMAL" }],
        }],
      }, {
        name: "tgt_schema",
        fields: [{ name: "price", type: "DECIMAL" }],
      }],
      mappings: [{ name: "m1", sources: ["src_schema"], targets: ["tgt_schema"] }],
      fieldArrows: [
        { mapping: "m1", source: "CartLines[].unit_price", target: "price", file: "test.stm", line: 10 },
      ],
    });

    const warnings = collectSemanticWarnings(index);
    const fieldWarnings = warnings.filter((w) => w.rule === "field-not-in-schema");
    assert.equal(fieldWarnings.length, 0, "List bracket paths should resolve without warnings");
  });

  it("accepts relative paths (.REFNUM) without warning", () => {
    const index = makeIndex({
      schemas: [{
        name: "src_schema",
        fields: [{ name: "top_field", type: "INT" }],
      }, {
        name: "tgt_schema",
        fields: [{ name: "out", type: "INT" }],
      }],
      mappings: [{ name: "m1", sources: ["src_schema"], targets: ["tgt_schema"] }],
      fieldArrows: [
        { mapping: "m1", source: ".REFNUM", target: ".orderNo", file: "test.stm", line: 10 },
      ],
    });

    const warnings = collectSemanticWarnings(index);
    const fieldWarnings = warnings.filter((w) => w.rule === "field-not-in-schema");
    assert.equal(fieldWarnings.length, 0, "Relative paths should be accepted");
  });
});

// ── Bug 2: Schema-qualified references ────────────────────────────────────────

describe("Bug 2: schema-qualified references in multi-source mappings", () => {
  it("resolves schema.field paths in multi-source mappings", () => {
    const index = makeIndex({
      schemas: [
        { name: "crm_customers", fields: [{ name: "customer_id", type: "INT" }, { name: "email", type: "STRING" }] },
        { name: "orders", fields: [{ name: "order_id", type: "INT" }] },
        { name: "target", fields: [{ name: "id", type: "INT" }, { name: "email", type: "STRING" }] },
      ],
      mappings: [{ name: "m1", sources: ["crm_customers", "orders"], targets: ["target"] }],
      fieldArrows: [
        { mapping: "m1", source: "crm_customers.customer_id", target: "id", file: "test.stm", line: 10 },
        { mapping: "m1", source: "crm_customers.email", target: "email", file: "test.stm", line: 11 },
      ],
    });

    const warnings = collectSemanticWarnings(index);
    const fieldWarnings = warnings.filter((w) => w.rule === "field-not-in-schema");
    assert.equal(fieldWarnings.length, 0, "Schema-qualified paths should resolve in multi-source mappings");
  });

  it("still warns for unknown schema qualifiers in multi-source mappings", () => {
    const index = makeIndex({
      schemas: [
        { name: "crm_customers", fields: [{ name: "email", type: "STRING" }] },
        { name: "orders", fields: [{ name: "order_id", type: "INT" }] },
        { name: "target", fields: [{ name: "email", type: "STRING" }] },
      ],
      mappings: [{ name: "m1", sources: ["crm_customers", "orders"], targets: ["target"] }],
      fieldArrows: [
        { mapping: "m1", source: "unknown_schema.email", target: "email", file: "test.stm", line: 10 },
      ],
    });

    const warnings = collectSemanticWarnings(index);
    const fieldWarnings = warnings.filter((w) => w.rule === "field-not-in-schema");
    assert.equal(fieldWarnings.length, 1, "Unknown schema qualifier should still warn");
  });
});

// ── Bug 3: Metric source extraction ──────────────────────────────────────────

describe("Bug 3: metric source extraction", () => {
  it("extracts single-value metric source correctly", () => {
    const meta = n("metadata_block", [
      kvPair("source", ident("fact_subscriptions")),
      kvPair("grain", ident("monthly")),
    ]);
    const body = n("metric_body", [fieldDecl("value", "DECIMAL")]);
    const block = n("metric_block", [blockLabel("mrr"), meta, body]);
    const root = n("source_file", [block]);

    const metrics = extractMetrics(root);
    assert.deepEqual(metrics[0].sources, ["fact_subscriptions"]);
  });

  it("extracts block-form metric sources", () => {
    const bracedList = n("kv_braced_list", [
      ident("fact_subscriptions"),
      ident("dim_customer"),
    ], "{fact_subscriptions, dim_customer}");
    const meta = n("metadata_block", [
      kvPair("source", bracedList),
    ]);
    const body = n("metric_body", []);
    const block = n("metric_block", [blockLabel("churn_rate"), meta, body]);
    const root = n("source_file", [block]);

    const metrics = extractMetrics(root);
    assert.deepEqual(metrics[0].sources, ["fact_subscriptions", "dim_customer"]);
  });

  it("does not warn for metric sources when no metric source resolves to a known schema", () => {
    const index = makeIndex({
      schemas: [{ name: "some_schema", fields: [] }],
      metrics: [{ name: "mrr", sources: ["external_table"], fields: [] }],
    });

    const warnings = collectSemanticWarnings(index);
    const metricWarnings = warnings.filter((w) => w.rule === "undefined-ref" && w.message.includes("Metric"));
    assert.equal(metricWarnings.length, 0, "Should not warn for purely external metric sources");
  });
});

// ── Bug 4: Suppress for schemas with unresolved spreads ──────────────────────

describe("Bug 4: suppress field-not-in-schema for schemas with spreads", () => {
  it("detects fragment_spread in schema body", () => {
    const spread = n("fragment_spread", [], "...audit fields");
    const body = n("schema_body", [fieldDecl("id", "INT"), spread]);
    const block = n("schema_block", [blockLabel("my_schema"), body]);
    const root = n("source_file", [block]);

    const schemas = extractSchemas(root);
    assert.equal(schemas[0].hasSpreads, true);
  });

  it("suppresses field-not-in-schema for target with unresolved spreads", () => {
    const index = makeIndex({
      schemas: [
        { name: "src", fields: [{ name: "created_at", type: "TIMESTAMP" }] },
        { name: "tgt", fields: [{ name: "id", type: "INT" }], hasSpreads: true },
      ],
      mappings: [{ name: "m1", sources: ["src"], targets: ["tgt"] }],
      fieldArrows: [
        { mapping: "m1", source: "created_at", target: "created_at", file: "test.stm", line: 10 },
      ],
    });

    const warnings = collectSemanticWarnings(index);
    const fieldWarnings = warnings.filter((w) => w.rule === "field-not-in-schema");
    assert.equal(fieldWarnings.length, 0, "Should not warn for target schema with unresolved spreads");
  });
});

// ── Bug 5: Duplicate warning elimination ─────────────────────────────────────

describe("Bug 5: duplicate warning elimination", () => {
  it("emits at most one warning per arrow", () => {
    const arrow = { mapping: "m1", source: "unknown_field", target: "also_unknown", file: "test.stm", line: 10 };
    const index = makeIndex({
      schemas: [
        { name: "src", fields: [{ name: "id", type: "INT" }] },
        { name: "tgt", fields: [{ name: "id", type: "INT" }] },
      ],
      mappings: [{ name: "m1", sources: ["src"], targets: ["tgt"] }],
      fieldArrows: [arrow],
    });

    const warnings = collectSemanticWarnings(index);
    const fieldWarnings = warnings.filter((w) => w.rule === "field-not-in-schema");
    // Should get exactly 2 warnings: one for source, one for target (not 4)
    assert.equal(fieldWarnings.length, 2);

    // Verify no duplicate messages
    const messages = fieldWarnings.map((w) => w.message);
    const uniqueMessages = [...new Set(messages)];
    assert.equal(messages.length, uniqueMessages.length, "No duplicate warning messages");
  });
});
