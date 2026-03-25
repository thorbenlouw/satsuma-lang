import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canonicalRef } from "#src/canonical-ref.js";
import { canonicalKey, resolveCanonicalKey } from "#src/index-builder.js";

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
