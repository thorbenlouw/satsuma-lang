/**
 * string-utils.test.js — Unit tests for src/string-utils.js
 *
 * Tests the two pure text utilities exported from @satsuma/core.
 * Normalization tests that previously lived in satsuma-cli/test/normalize.test.js
 * have been retired in favour of these canonical tests in core.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { capitalize, normalizeName } from "@satsuma/core";

describe("capitalize", () => {
  it("uppercases the first character and leaves the rest unchanged", () => {
    // Verifies the contract used when formatting diagnostic messages, e.g.
    // "Schema 'foo' is already defined…" where 'schema' comes from a node kind.
    assert.equal(capitalize("schema"), "Schema");
    assert.equal(capitalize("mapping"), "Mapping");
  });

  it("handles a single character", () => {
    assert.equal(capitalize("a"), "A");
  });

  it("returns an empty string unchanged", () => {
    assert.equal(capitalize(""), "");
  });
});

describe("normalizeName", () => {
  it("lowercases and strips underscores", () => {
    // Core contract: FIRST_NM and firstnm must be considered equivalent.
    assert.equal(normalizeName("FIRST_NM"), "firstnm");
  });

  it("strips hyphens", () => {
    assert.equal(normalizeName("first-name"), "firstname");
  });

  it("strips spaces", () => {
    // Needed for matching header labels like "First Name" against snake_case columns.
    assert.equal(normalizeName("First Name"), "firstname");
  });

  it("FirstName matches first_name after normalization", () => {
    // The canonical equivalence relied on by the field-matching logic.
    assert.equal(normalizeName("FirstName"), normalizeName("first_name"));
  });

  it("does not conflate unrelated names that share a suffix", () => {
    // MailingCity and city normalise differently — normalization is not stemming.
    assert.notEqual(normalizeName("MailingCity"), normalizeName("city"));
  });
});
