/**
 * canonical-ref.test.js — Unit tests for satsuma-core canonical-ref module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalRef, canonicalEntityName } from "../dist/canonical-ref.js";

describe("canonicalRef()", () => {
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
});

describe("canonicalEntityName()", () => {
  it("returns namespace::name when both present", () => {
    assert.equal(canonicalEntityName({ namespace: "crm", name: "customers" }), "crm::customers");
  });

  it("returns ::name when no namespace", () => {
    assert.equal(canonicalEntityName({ name: "customers" }), "::customers");
  });

  it("returns :: when name is null", () => {
    assert.equal(canonicalEntityName({ name: null }), "::");
  });
});
