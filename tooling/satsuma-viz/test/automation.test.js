import "./dom-shim.js";
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

describe("viz automation helpers", () => {
  it("sanitizes test-id segments into stable selector-friendly names", async () => {
    const mod = await import("../dist/satsuma-viz.js");
    assert.equal(mod.sanitizeTestIdSegment("crm::Customer Orders"), "crm-customer-orders");
  });

  it("reports loading state before layout is available", async () => {
    const mod = await import("../dist/satsuma-viz.js");
    assert.deepEqual(
      mod.describeVizAutomationState({
        hasModel: true,
        hasOverviewLayout: false,
        hasDetailLayout: false,
        layoutError: false,
        viewMode: "overview",
      }),
      { readyState: "loading", renderMode: "empty", viewMode: "overview" },
    );
  });

  it("reports ready overview state once layout is complete", async () => {
    const mod = await import("../dist/satsuma-viz.js");
    assert.deepEqual(
      mod.describeVizAutomationState({
        hasModel: true,
        hasOverviewLayout: true,
        hasDetailLayout: true,
        layoutError: false,
        viewMode: "overview",
      }),
      { readyState: "ready", renderMode: "overview", viewMode: "overview" },
    );
  });

  it("reports fallback state when layout computation fails", async () => {
    const mod = await import("../dist/satsuma-viz.js");
    assert.deepEqual(
      mod.describeVizAutomationState({
        hasModel: true,
        hasOverviewLayout: false,
        hasDetailLayout: false,
        layoutError: true,
        viewMode: "overview",
      }),
      { readyState: "fallback", renderMode: "fallback", viewMode: "overview" },
    );
  });

  it("renders stable selector markers into the schema-card template", async () => {
    const mod = await import("../dist/satsuma-viz.js");
    const schemaCard = new mod.SzSchemaCard();
    schemaCard.testIdPrefix = "detail-schema-card-customers";
    schemaCard.schema = {
      id: "customers",
      qualifiedId: "customers",
      kind: "schema",
      label: null,
      fields: [{
        name: "customer_id",
        type: "UUID",
        constraints: [],
        notes: [],
        comments: [],
        children: [],
        location: { uri: "file:///test.stm", line: 1, character: 0 },
      }],
      notes: [],
      comments: [],
      metadata: [],
      location: { uri: "file:///test.stm", line: 0, character: 0 },
      hasExternalLineage: false,
      spreads: [],
    };
    const output = schemaCard.render();
    const fieldTemplate = schemaCard._renderField(schemaCard.schema.fields[0], 0);
    const serialized = [
      ...output.strings,
      ...output.values.map(String),
      ...fieldTemplate.strings,
      ...fieldTemplate.values.map(String),
    ].join(" ");

    assert.match(serialized, /data-testid/);
    assert.match(serialized, /detail-schema-card-customers-header/);
    assert.match(serialized, /detail-schema-card-customers-fields/);
    assert.match(serialized, /detail-schema-card-customers-field-customer-id-lineage/);
  });
});
