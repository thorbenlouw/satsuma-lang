import "./dom-shim.js";
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

describe("@satsuma/viz bundle", () => {
  /** @type {typeof import("../dist/satsuma-viz.js")} */
  let mod;

  it("loads the bundle without errors", async () => {
    mod = await import("../dist/satsuma-viz.js");
    assert.ok(mod);
  });

  it("exports SatsumaViz class", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.SatsumaViz, "function");
  });

  it("exports SzSchemaCard class", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.SzSchemaCard, "function");
  });

  it("SzSchemaCard has compact property defaulting to false", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    const card = new mod.SzSchemaCard();
    assert.equal(card.compact, false, "compact should default to false");
  });

  it("exports SzMetricCard class", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.SzMetricCard, "function");
  });

  it("exports SzFragmentCard class", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.SzFragmentCard, "function");
  });

  it("exports SzNavigateEvent class", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.SzNavigateEvent, "function");
  });

  it("exports SzEdgeLayer class", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.SzEdgeLayer, "function");
  });

  it("exports SzMappingDetail class", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.SzMappingDetail, "function");
  });

  it("exports SzOverviewEdgeLayer class", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.SzOverviewEdgeLayer, "function");
  });

  it("exports SzOpenMappingEvent class", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.SzOpenMappingEvent, "function");
  });

  it("exports computeOverviewLayout function", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.computeOverviewLayout, "function");
  });

  it("SzSchemaCard has highlightFields and highlightColor properties", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    const card = new mod.SzSchemaCard();
    assert.ok(card.highlightFields instanceof Set, "highlightFields should be a Set");
    assert.equal(card.highlightFields.size, 0, "highlightFields should default empty");
    assert.equal(card.highlightColor, "", "highlightColor should default to empty string");
  });
});

describe("VizModel fixture validation", () => {
  it("accepts a minimal VizModel shape", () => {
    /** @type {import("../src/model.js").VizModel} */
    const model = {
      uri: "file:///test.stm",
      fileNotes: [],
      namespaces: [
        {
          name: null,
          schemas: [
            {
              id: "customers",
              qualifiedId: "customers",
              kind: "schema",
              label: "CRM customers",
              fields: [
                {
                  name: "id",
                  type: "UUID",
                  constraints: ["pk", "required"],
                  notes: [],
                  comments: [],
                  children: [],
                  location: { uri: "file:///test.stm", line: 3, character: 2 },
                },
                {
                  name: "email",
                  type: "STRING",
                  constraints: ["pii"],
                  notes: [],
                  comments: [
                    {
                      kind: "warning",
                      text: "Must be hashed before export",
                      location: { uri: "file:///test.stm", line: 4, character: 2 },
                    },
                  ],
                  children: [],
                  location: { uri: "file:///test.stm", line: 5, character: 2 },
                },
              ],
              notes: [],
              comments: [],
              metadata: [],
              location: { uri: "file:///test.stm", line: 1, character: 0 },
              hasExternalLineage: false,
            },
          ],
          mappings: [],
          metrics: [],
          fragments: [],
        },
      ],
    };

    assert.equal(model.namespaces.length, 1);
    assert.equal(model.namespaces[0].schemas[0].fields.length, 2);
    assert.equal(model.namespaces[0].schemas[0].fields[1].constraints[0], "pii");
    assert.equal(model.namespaces[0].schemas[0].fields[1].comments[0].kind, "warning");
  });

  it("accepts a metric VizModel shape", () => {
    /** @type {import("../src/model.js").MetricCard} */
    const metric = {
      id: "monthly_revenue",
      qualifiedId: "monthly_revenue",
      label: "MRR",
      source: ["orders"],
      grain: "monthly",
      slices: ["segment", "region"],
      filter: null,
      fields: [
        {
          name: "value",
          type: "DECIMAL(14,2)",
          measure: "additive",
          notes: [],
          location: { uri: "file:///test.stm", line: 20, character: 2 },
        },
        {
          name: "avg_order",
          type: "DECIMAL(10,2)",
          measure: "non_additive",
          notes: [],
          location: { uri: "file:///test.stm", line: 21, character: 2 },
        },
      ],
      notes: [],
      comments: [],
      location: { uri: "file:///test.stm", line: 18, character: 0 },
    };

    assert.equal(metric.fields.length, 2);
    assert.equal(metric.fields[0].measure, "additive");
    assert.equal(metric.slices.length, 2);
  });

  it("accepts a fragment VizModel shape", () => {
    /** @type {import("../src/model.js").FragmentCard} */
    const fragment = {
      id: "audit_fields",
      fields: [
        {
          name: "created_at",
          type: "TIMESTAMP",
          constraints: ["required"],
          notes: [],
          comments: [],
          children: [],
          location: { uri: "file:///test.stm", line: 30, character: 2 },
        },
      ],
      notes: [],
      location: { uri: "file:///test.stm", line: 28, character: 0 },
    };

    assert.equal(fragment.fields.length, 1);
    assert.equal(fragment.id, "audit_fields");
  });
});
