/**
 * nl-ref-extract.test.js — Tests for NL backtick reference extraction utility
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractBacktickRefs,
  classifyRef,
  resolveRef,
  isSchemaInMappingSources,
  resolveAllNLRefs,
} from "#src/nl-ref-extract.js";

// ── extractBacktickRefs ─────────────────────────────────────────────────────

describe("extractBacktickRefs", () => {
  it("extracts a single backtick reference", () => {
    const refs = extractBacktickRefs("Lookup `department` from employees");
    assert.equal(refs.length, 1);
    assert.equal(refs[0].ref, "department");
  });

  it("extracts multiple backtick references", () => {
    const refs = extractBacktickRefs(
      "Lookup `department` from `source::hr_employees` using `posted_by` -> `employee_id`",
    );
    assert.equal(refs.length, 4);
    assert.deepEqual(refs.map((r) => r.ref), [
      "department",
      "source::hr_employees",
      "posted_by",
      "employee_id",
    ]);
  });

  it("returns empty array for text without backticks", () => {
    const refs = extractBacktickRefs("No references here");
    assert.equal(refs.length, 0);
  });

  it("returns empty array for empty string", () => {
    const refs = extractBacktickRefs("");
    assert.equal(refs.length, 0);
  });

  it("captures correct offsets", () => {
    const refs = extractBacktickRefs("abc `foo` xyz `bar`");
    assert.equal(refs[0].offset, 4);
    assert.equal(refs[1].offset, 14);
  });
});

// ── classifyRef ─────────────────────────────────────────────────────────────

describe("classifyRef", () => {
  it("classifies namespace-qualified schema", () => {
    assert.equal(classifyRef("source::hr_employees"), "namespace-qualified-schema");
  });

  it("classifies namespace-qualified field", () => {
    assert.equal(classifyRef("source::hr_employees.department"), "namespace-qualified-field");
  });

  it("classifies dotted field", () => {
    assert.equal(classifyRef("hr_employees.department"), "dotted-field");
  });

  it("classifies bare identifier", () => {
    assert.equal(classifyRef("department"), "bare");
  });
});

// ── resolveRef ──────────────────────────────────────────────────────────────

describe("resolveRef", () => {
  const makeIndex = (schemas = {}, transforms = {}, fragments = {}) => ({
    schemas: new Map(Object.entries(schemas)),
    transforms: new Map(Object.entries(transforms)),
    fragments: new Map(Object.entries(fragments)),
  });

  it("resolves namespace-qualified schema", () => {
    const index = makeIndex({
      "source::hr_employees": { fields: [{ name: "employee_id" }] },
    });
    const result = resolveRef("source::hr_employees", {}, index);
    assert.equal(result.resolved, true);
    assert.equal(result.resolvedTo.kind, "schema");
  });

  it("returns unresolved for unknown namespace-qualified schema", () => {
    const index = makeIndex({});
    const result = resolveRef("source::nonexistent", {}, index);
    assert.equal(result.resolved, false);
  });

  it("resolves namespace-qualified field", () => {
    const index = makeIndex({
      "source::hr_employees": { fields: [{ name: "department" }] },
    });
    const result = resolveRef("source::hr_employees.department", {}, index);
    assert.equal(result.resolved, true);
    assert.equal(result.resolvedTo.kind, "field");
  });

  it("returns unresolved for unknown field in known schema", () => {
    const index = makeIndex({
      "source::hr_employees": { fields: [{ name: "employee_id" }] },
    });
    const result = resolveRef("source::hr_employees.nonexistent", {}, index);
    assert.equal(result.resolved, false);
  });

  it("resolves bare field against mapping sources", () => {
    const index = makeIndex({
      "source::finance_gl": { fields: [{ name: "posted_by" }] },
    });
    const context = { sources: ["source::finance_gl"], targets: [] };
    const result = resolveRef("posted_by", context, index);
    assert.equal(result.resolved, true);
    assert.equal(result.resolvedTo.kind, "field");
    assert.equal(result.resolvedTo.name, "source::finance_gl.posted_by");
  });

  it("resolves bare identifier as transform name", () => {
    const index = makeIndex({}, { clean_string: {} });
    const result = resolveRef("clean_string", {}, index);
    assert.equal(result.resolved, true);
    assert.equal(result.resolvedTo.kind, "transform");
  });

  it("resolves bare identifier via namespace lookup", () => {
    const index = makeIndex({ "staging::stg_employees": { fields: [] } });
    const context = { sources: [], targets: [], namespace: "staging" };
    const result = resolveRef("stg_employees", context, index);
    assert.equal(result.resolved, true);
    assert.equal(result.resolvedTo.kind, "schema");
    assert.equal(result.resolvedTo.name, "staging::stg_employees");
  });

  it("returns unresolved for completely unknown bare identifier", () => {
    const index = makeIndex({});
    const result = resolveRef("nonexistent", { sources: [], targets: [] }, index);
    assert.equal(result.resolved, false);
  });

  it("resolves nested field names", () => {
    const index = makeIndex({
      "source::orders": {
        fields: [{ name: "Customer", children: [{ name: "Email" }] }],
      },
    });
    const context = { sources: ["source::orders"], targets: [] };
    const result = resolveRef("Email", context, index);
    assert.equal(result.resolved, true);
  });
});

// ── resolveRef with fragment spreads ─────────────────────────────────────────

describe("resolveRef — fragment spread expansion", () => {
  const makeIndex = (schemas = {}, transforms = {}, fragments = {}) => ({
    schemas: new Map(Object.entries(schemas)),
    transforms: new Map(Object.entries(transforms)),
    fragments: new Map(Object.entries(fragments)),
  });

  it("resolves namespace-qualified field via fragment spread", () => {
    const index = makeIndex(
      {
        "ex::product_day": {
          fields: [{ name: "DAY_DATE" }],
          hasSpreads: true,
          spreads: ["common_measures"],
          namespace: "ex",
        },
      },
      {},
      {
        "ex::common_measures": {
          fields: [{ name: "SALES_VALUE" }, { name: "RETURN_VALUE" }],
          hasSpreads: false,
        },
      },
    );
    const result = resolveRef("ex::product_day.SALES_VALUE", {}, index);
    assert.equal(result.resolved, true);
    assert.equal(result.resolvedTo.kind, "field");
  });

  it("resolves dotted-field via fragment spread", () => {
    const index = makeIndex(
      {
        "ex::product_day": {
          fields: [{ name: "DAY_DATE" }],
          hasSpreads: true,
          spreads: ["common_measures"],
          namespace: "ex",
        },
      },
      {},
      {
        "ex::common_measures": {
          fields: [{ name: "SALES_VALUE" }],
          hasSpreads: false,
        },
      },
    );
    const context = { sources: ["ex::product_day"], targets: [] };
    const result = resolveRef("product_day.SALES_VALUE", context, index);
    assert.equal(result.resolved, true);
    assert.equal(result.resolvedTo.kind, "field");
  });

  it("resolves bare identifier via fragment spread", () => {
    const index = makeIndex(
      {
        "ex::product_day": {
          fields: [{ name: "DAY_DATE" }],
          hasSpreads: true,
          spreads: ["common_measures"],
          namespace: "ex",
        },
      },
      {},
      {
        "ex::common_measures": {
          fields: [{ name: "SALES_VALUE" }],
          hasSpreads: false,
        },
      },
    );
    const context = { sources: ["ex::product_day"], targets: [] };
    const result = resolveRef("SALES_VALUE", context, index);
    assert.equal(result.resolved, true);
    assert.equal(result.resolvedTo.kind, "field");
  });

  it("resolves field via transitive fragment spread", () => {
    const index = makeIndex(
      {
        "ex::product_day": {
          fields: [{ name: "DAY_DATE" }],
          hasSpreads: true,
          spreads: ["base_measures"],
          namespace: "ex",
        },
      },
      {},
      {
        "ex::base_measures": {
          fields: [{ name: "QUANTITY" }],
          hasSpreads: true,
          spreads: ["audit_fields"],
          namespace: "ex",
        },
        "ex::audit_fields": {
          fields: [{ name: "CREATED_AT" }, { name: "UPDATED_AT" }],
          hasSpreads: false,
        },
      },
    );
    const result = resolveRef("ex::product_day.CREATED_AT", {}, index);
    assert.equal(result.resolved, true);
    assert.equal(result.resolvedTo.kind, "field");
  });

  it("still returns unresolved for genuine miss with spreads", () => {
    const index = makeIndex(
      {
        "ex::product_day": {
          fields: [{ name: "DAY_DATE" }],
          hasSpreads: true,
          spreads: ["common_measures"],
          namespace: "ex",
        },
      },
      {},
      {
        "ex::common_measures": {
          fields: [{ name: "SALES_VALUE" }],
          hasSpreads: false,
        },
      },
    );
    const result = resolveRef("ex::product_day.NONEXISTENT", {}, index);
    assert.equal(result.resolved, false);
  });
});

// ── isSchemaInMappingSources ────────────────────────────────────────────────

describe("isSchemaInMappingSources", () => {
  it("returns true when schema is in sources", () => {
    const mapping = { sources: ["source::hr_employees"], targets: ["staging::stg_employees"] };
    assert.equal(isSchemaInMappingSources("source::hr_employees", mapping), true);
  });

  it("returns true when schema is in targets", () => {
    const mapping = { sources: [], targets: ["staging::stg_employees"] };
    assert.equal(isSchemaInMappingSources("staging::stg_employees", mapping), true);
  });

  it("returns false when schema is not in sources or targets", () => {
    const mapping = { sources: ["source::finance_gl"], targets: ["staging::stg_gl"] };
    assert.equal(isSchemaInMappingSources("source::hr_employees", mapping), false);
  });

  it("returns false for null mapping", () => {
    assert.equal(isSchemaInMappingSources("source::hr_employees", null), false);
  });
});

// ── resolveAllNLRefs ────────────────────────────────────────────────────────

describe("resolveAllNLRefs", () => {
  it("resolves refs from nlRefData in the index", () => {
    const index = {
      schemas: new Map([
        ["source::hr_employees", { fields: [{ name: "department" }, { name: "employee_id" }] }],
        ["source::finance_gl", { fields: [{ name: "posted_by" }] }],
      ]),
      mappings: new Map([
        ["staging::stage gl entries", {
          sources: ["source::finance_gl", "source::hr_employees"],
          targets: ["staging::stg_gl_entries"],
        }],
      ]),
      transforms: new Map(),
      fragments: new Map(),
      nlRefData: [{
        text: "Lookup `department` from `source::hr_employees` using `posted_by` -> `employee_id`",
        mapping: "stage gl entries",
        namespace: "staging",
        targetField: "department",
        file: "ns-merging.stm",
        line: 99,
        column: 6,
      }],
    };

    const results = resolveAllNLRefs(index);
    assert.equal(results.length, 4);

    // All should resolve
    assert.ok(results.every((r) => r.resolved), "all refs should resolve");

    // Check specific resolutions
    const deptRef = results.find((r) => r.ref === "department");
    assert.equal(deptRef.resolvedTo.kind, "field");

    const schemaRef = results.find((r) => r.ref === "source::hr_employees");
    assert.equal(schemaRef.resolvedTo.kind, "schema");
    assert.equal(schemaRef.classification, "namespace-qualified-schema");
  });

  it("returns empty for index with no nlRefData", () => {
    const index = {
      schemas: new Map(),
      mappings: new Map(),
      transforms: new Map(),
      fragments: new Map(),
    };
    const results = resolveAllNLRefs(index);
    assert.equal(results.length, 0);
  });
});
