import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canonicalRef, canonicalEntityName } from "@satsuma/core";
import { canonicalKey, resolveCanonicalKey, resolveScopedEntityRef, resolveIndexKey } from "#src/index-builder.js";

describe("canonicalRef", () => {
  it("returns ::schema.field when no namespace", () => {
    assert.equal(canonicalRef(undefined, "customers", "email"), "::customers.email");
  });

  it("returns ::schema.field when namespace is null", () => {
    assert.equal(canonicalRef(null, "customers", "email"), "::customers.email");
  });

  it("returns namespace::schema.field when namespace present", () => {
    assert.equal(canonicalRef("crm", "customers", "email"), "crm::customers.email");
  });

  it("returns ::schema when field is omitted", () => {
    assert.equal(canonicalRef(undefined, "customers"), "::customers");
  });

  it("returns namespace::schema when field is omitted", () => {
    assert.equal(canonicalRef("crm", "customers"), "crm::customers");
  });

  it("returns ::schema when field is null", () => {
    assert.equal(canonicalRef(null, "customers", null), "::customers");
  });

  it("returns ::schema when field is empty string", () => {
    assert.equal(canonicalRef(undefined, "customers", ""), "::customers");
  });

  it("handles special characters in schema and field names", () => {
    assert.equal(
      canonicalRef("ns", "order-headers", "Account.Name"),
      "ns::order-headers.Account.Name",
    );
  });

  it("handles empty namespace string (treated same as no namespace)", () => {
    assert.equal(canonicalRef("", "customers", "id"), "::customers.id");
  });
});

describe("canonicalKey", () => {
  it("adds :: prefix to bare schema names", () => {
    assert.equal(canonicalKey("customers"), "::customers");
  });

  it("preserves namespace-qualified keys", () => {
    assert.equal(canonicalKey("crm::customers"), "crm::customers");
  });

  it("preserves already-canonical unscoped keys", () => {
    assert.equal(canonicalKey("::customers"), "::customers");
  });
});

describe("canonicalEntityName", () => {
  it("formats global entity", () => {
    assert.equal(canonicalEntityName({ name: "customers" }), "::customers");
  });

  it("formats namespaced entity", () => {
    assert.equal(canonicalEntityName({ namespace: "crm", name: "customers" }), "crm::customers");
  });

  it("handles null name", () => {
    assert.equal(canonicalEntityName({ name: null }), "::");
  });

  it("treats undefined namespace as global", () => {
    assert.equal(canonicalEntityName({ namespace: undefined, name: "foo" }), "::foo");
  });

  it("treats null namespace as global", () => {
    assert.equal(canonicalEntityName({ namespace: null, name: "foo" }), "::foo");
  });
});

describe("resolveCanonicalKey", () => {
  it("strips :: prefix from unscoped canonical keys", () => {
    assert.equal(resolveCanonicalKey("::customers"), "customers");
  });

  it("preserves namespace-qualified keys", () => {
    assert.equal(resolveCanonicalKey("crm::customers"), "crm::customers");
  });

  it("preserves bare keys", () => {
    assert.equal(resolveCanonicalKey("customers"), "customers");
  });
});

// ── resolveScopedEntityRef ──────────────────────────────────────────────────

describe("resolveScopedEntityRef", () => {
  const map = new Map<string, unknown>([
    ["customers", {}],
    ["crm::orders", {}],
    ["billing::invoices", {}],
  ]);

  it("resolves fully-qualified ref when present", () => {
    assert.equal(resolveScopedEntityRef("crm::orders", null, map), "crm::orders");
  });

  it("returns null for fully-qualified ref not in map", () => {
    assert.equal(resolveScopedEntityRef("crm::missing", null, map), null);
  });

  it("resolves unqualified ref via current namespace first", () => {
    assert.equal(resolveScopedEntityRef("orders", "crm", map), "crm::orders");
  });

  it("falls back to bare name when namespace lookup fails", () => {
    assert.equal(resolveScopedEntityRef("customers", "crm", map), "customers");
  });

  it("resolves bare name directly when no namespace context", () => {
    assert.equal(resolveScopedEntityRef("customers", null, map), "customers");
  });

  it("returns null when neither namespaced nor bare exists", () => {
    assert.equal(resolveScopedEntityRef("missing", "crm", map), null);
  });

  it("returns null for bare lookup with no namespace and no match", () => {
    assert.equal(resolveScopedEntityRef("missing", null, map), null);
  });
});

// ── resolveIndexKey ─────────────────────────────────────────────────────────

describe("resolveIndexKey", () => {
  const map = new Map([
    ["customers", { id: 1 }],
    ["crm::orders", { id: 2 }],
    ["billing::orders", { id: 3 }],
  ]);

  it("returns exact match", () => {
    const result = resolveIndexKey("customers", map);
    assert.ok(result);
    assert.equal(result.key, "customers");
    assert.equal(result.entry.id, 1);
  });

  it("resolves unqualified name to single namespace match", () => {
    // "customers" is already a bare key, but this tests the suffix lookup
    const singleNs = new Map([["crm::widgets", { id: 4 }]]);
    const result = resolveIndexKey("widgets", singleNs);
    assert.ok(result);
    assert.equal(result.key, "crm::widgets");
  });

  it("returns null for ambiguous unqualified name", () => {
    // Both "crm::orders" and "billing::orders" end with "::orders"
    const result = resolveIndexKey("orders", map);
    assert.equal(result, null, "should be null for ambiguous match");
  });

  it("returns null for qualified name not in map", () => {
    const result = resolveIndexKey("crm::missing", map);
    assert.equal(result, null);
  });

  it("returns null for unqualified name with no matches", () => {
    const result = resolveIndexKey("nonexistent", map);
    assert.equal(result, null);
  });
});
