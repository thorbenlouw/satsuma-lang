/**
 * field-utils.test.js — Unit tests for shared field tree helpers.
 *
 * These helpers are intentionally tested in satsuma-core because both CLI
 * commands and editor features need the same nested-field traversal semantics.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectFieldNames, findFieldByPath } from "../dist/field-utils.js";

const fields = [
  {
    name: "customer",
    children: [
      { name: "id" },
      {
        name: "address",
        children: [{ name: "street" }],
      },
    ],
  },
  { name: "status" },
];

describe("findFieldByPath()", () => {
  it("returns the nested field so callers can distinguish an existing path from a missing one", () => {
    assert.deepEqual(findFieldByPath(fields, "customer.address.street"), { name: "street" });
  });

  it("accepts pre-split path segments without changing traversal semantics", () => {
    assert.deepEqual(findFieldByPath(fields, ["customer", "id"]), { name: "id" });
  });

  it("returns null when an intermediate segment is not a field", () => {
    assert.equal(findFieldByPath(fields, "customer.missing.street"), null);
  });
});

describe("collectFieldNames()", () => {
  it("collects bare names from every level for command fallbacks that accept leaf names", () => {
    assert.deepEqual(collectFieldNames(fields), ["customer", "id", "address", "street", "status"]);
  });
});
