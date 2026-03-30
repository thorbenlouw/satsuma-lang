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

  it("SzMetricCard has compact property defaulting to false", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    const card = new mod.SzMetricCard();
    assert.equal(card.compact, false, "compact should default to false");
  });

  it("exports SzFragmentCard class", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    assert.equal(typeof mod.SzFragmentCard, "function");
  });

  it("SzFragmentCard has compact property defaulting to false", async () => {
    mod ??= await import("../dist/satsuma-viz.js");
    const card = new mod.SzFragmentCard();
    assert.equal(card.compact, false, "compact should default to false");
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

// VizModel fixture validation tests live in @satsuma/viz-model/test/model.test.js.
// Duplicating them here would re-test the same invariants after a re-export shim,
// which adds no value — see satsuma-viz-model for the canonical contract tests.
