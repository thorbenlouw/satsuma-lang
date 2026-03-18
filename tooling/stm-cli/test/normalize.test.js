/**
 * normalize.test.js — Unit tests for src/normalize.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeName, matchFields } from "../src/normalize.js";

describe("normalizeName", () => {
  it("lowercases and strips underscores", () => {
    assert.equal(normalizeName("FIRST_NM"), "firstnm");
  });

  it("strips hyphens", () => {
    assert.equal(normalizeName("first-name"), "firstname");
  });

  it("FirstName matches first_name after normalization", () => {
    assert.equal(normalizeName("FirstName"), normalizeName("first_name"));
  });

  it("MailingCity does NOT match city", () => {
    assert.notEqual(normalizeName("MailingCity"), normalizeName("city"));
  });
});

describe("matchFields", () => {
  it("matches fields by normalized name", () => {
    const src = [{ name: "FirstName", type: "VARCHAR" }];
    const tgt = [{ name: "first_name", type: "VARCHAR" }];
    const result = matchFields(src, tgt);
    assert.equal(result.matched.length, 1);
    assert.equal(result.matched[0].source, "FirstName");
    assert.equal(result.matched[0].target, "first_name");
    assert.equal(result.matched[0].normalized, "firstname");
  });

  it("returns source-only and target-only correctly", () => {
    const src = [
      { name: "id", type: "INT" },
      { name: "email", type: "VARCHAR" },
    ];
    const tgt = [
      { name: "email", type: "VARCHAR" },
      { name: "phone", type: "VARCHAR" },
    ];
    const result = matchFields(src, tgt);
    assert.equal(result.matched.length, 1);
    assert.deepEqual(result.sourceOnly, ["id"]);
    assert.deepEqual(result.targetOnly, ["phone"]);
  });

  it("handles empty fields", () => {
    const result = matchFields([], []);
    assert.equal(result.matched.length, 0);
    assert.equal(result.sourceOnly.length, 0);
    assert.equal(result.targetOnly.length, 0);
  });
});
