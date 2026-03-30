/**
 * nl-ref.test.js — Unit tests for satsuma-core nl-ref module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractAtRefs,
  classifyRef,
  resolveRef,
  resolveAllNLRefs,
} from "../dist/nl-ref.js";

// ── extractAtRefs ─────────────────────────────────────────────────────────────

describe("extractAtRefs()", () => {
  it("extracts @ref mentions", () => {
    const refs = extractAtRefs("Sum @amount grouped by @order_id");
    assert.deepEqual(refs.map(r => r.ref), ["amount", "order_id"]);
  });

  it("extracts @ns::schema.field refs", () => {
    const refs = extractAtRefs("Join @crm::customers.id to @dim_customer.customer_id");
    assert.deepEqual(refs.map(r => r.ref), ["crm::customers.id", "dim_customer.customer_id"]);
  });

  it("handles @`backtick-name` refs", () => {
    const refs = extractAtRefs("@`order-id` value");
    assert.equal(refs.length, 1);
    assert.equal(refs[0].ref, "order-id");
  });

  it("returns empty for text with no refs", () => {
    const refs = extractAtRefs("plain text with no references");
    assert.deepEqual(refs, []);
  });
});

// ── classifyRef ───────────────────────────────────────────────────────────────

describe("classifyRef()", () => {
  it("classifies bare identifier", () => {
    assert.equal(classifyRef("customer_id"), "bare");
  });

  it("classifies dotted field", () => {
    assert.equal(classifyRef("schema.field"), "dotted-field");
  });

  it("classifies namespace-qualified schema", () => {
    assert.equal(classifyRef("crm::customers"), "namespace-qualified-schema");
  });

  it("classifies namespace-qualified field", () => {
    assert.equal(classifyRef("crm::customers.email"), "namespace-qualified-field");
  });
});

// ── resolveRef ────────────────────────────────────────────────────────────────

function makeLookup(schemas = {}, fragments = {}, transforms = {}, mappings = {}) {
  const schemaMap = new Map(Object.entries(schemas));
  const fragMap = new Map(Object.entries(fragments));
  const transformMap = new Map(Object.entries(transforms));
  const mappingMap = new Map(Object.entries(mappings));
  return {
    hasSchema: (k) => schemaMap.has(k),
    getSchema: (k) => schemaMap.get(k) ?? null,
    hasFragment: (k) => fragMap.has(k),
    getFragment: (k) => fragMap.get(k) ?? null,
    hasTransform: (k) => transformMap.has(k),
    getMapping: (k) => mappingMap.get(k) ?? null,
    iterateSchemas: () => schemaMap.entries(),
  };
}

describe("resolveRef()", () => {
  it("resolves a bare field against mapping sources", () => {
    const lookup = makeLookup({ "::orders": { fields: [{ name: "order_id" }], hasSpreads: false } });
    const ctx = { sources: ["::orders"], targets: [], namespace: null };
    const r = resolveRef("order_id", ctx, lookup);
    assert.equal(r.resolved, true);
    assert.equal(r.resolvedTo.kind, "field");
    assert.equal(r.resolvedTo.name, "::orders.order_id");
  });

  it("resolves a namespace-qualified schema", () => {
    const lookup = makeLookup({ "crm::customers": { fields: [], hasSpreads: false } });
    const ctx = { sources: [], targets: [], namespace: null };
    const r = resolveRef("crm::customers", ctx, lookup);
    assert.equal(r.resolved, true);
    assert.equal(r.resolvedTo.kind, "schema");
  });

  it("returns unresolved for unknown ref", () => {
    const lookup = makeLookup({});
    const ctx = { sources: [], targets: [], namespace: null };
    const r = resolveRef("unknown_field", ctx, lookup);
    assert.equal(r.resolved, false);
  });

  it("resolves bare field via workspace fallback when no context", () => {
    const lookup = makeLookup({ my_schema: { fields: [{ name: "email" }], hasSpreads: false } });
    const ctx = { sources: [], targets: [], namespace: null };
    const r = resolveRef("email", ctx, lookup);
    assert.equal(r.resolved, true);
    assert.equal(r.resolvedTo.kind, "field");
  });
});

// ── resolveAllNLRefs ──────────────────────────────────────────────────────────

describe("resolveAllNLRefs()", () => {
  it("resolves refs from NL ref data items", () => {
    const lookup = makeLookup({ "::orders": { fields: [{ name: "amount" }], hasSpreads: false } });
    const items = [
      {
        text: "Sum @amount",
        mapping: "my_mapping",
        namespace: null,
        targetField: "total",
        line: 5,
        column: 0,
        file: "test.stm",
      },
    ];
    const results = resolveAllNLRefs(items, lookup);
    assert.equal(results.length, 1);
    assert.equal(results[0].ref, "amount");
    assert.equal(results[0].classification, "bare");
  });

  it("returns empty array for empty input", () => {
    const lookup = makeLookup({});
    assert.deepEqual(resolveAllNLRefs([], lookup), []);
  });
});
